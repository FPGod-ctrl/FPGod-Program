/**
 * Batch: personalised re-engagement emails for ceased-fee ("CF") clients.
 *
 * Reads every super statement in intake/client-statements, extracts the text,
 * and has Claude draft a SHORT, DIRECT email per client that names the critical
 * areas needing review and the concrete value on offer — with a review meeting
 * as the call to action. Drafts land in generated-plans/client-emails/.
 *
 * Usage (from server/):
 *   node scripts/generate-cf-emails.mjs                # all clients, skip done
 *   node scripts/generate-cf-emails.mjs --limit 3      # test on first 3
 *   node scripts/generate-cf-emails.mjs --force        # redo even if drafted
 *   node scripts/generate-cf-emails.mjs --concurrency 6
 *   node scripts/generate-cf-emails.mjs --model claude-sonnet-4-6
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import extractText from '../src/services/documentExtractor.js';
import { env } from '../src/config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const INTAKE = path.join(ROOT, 'intake', 'cfs non fee paying client review');
const OUT = path.join(ROOT, 'generated-plans', 'client-emails');

// ---- CLI args ----------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const LIMIT = Number(flag('limit', 0)) || 0;
const FORCE = Boolean(flag('force', false));
// --refresh: regenerate ONLY clients who still have an existing draft (overwrite
// in place), and skip any client whose draft was removed. Used to re-run the
// prompt over a curated subset without resurrecting deleted drafts.
const REFRESH = Boolean(flag('refresh', false));
// --retry-failed: read the existing manifest and regenerate ONLY the clients
// whose last run status was a failure (e.g. an API outage or credit stop),
// leaving everyone already drafted untouched.
const RETRY_FAILED = Boolean(flag('retry-failed', false));
// --min-age N: only draft emails for clients aged N or over. Clients whose age
// cannot be read from the statement are still drafted, but flagged in the
// manifest so they can be checked manually.
const MIN_AGE = Number(flag('min-age', 0)) || 0;
// --max-age N: skip clients OVER N (age > N). Same as MIN_AGE, unknown ages are
// still drafted and flagged for manual review. Use to exclude retirees past the
// point this re-engagement campaign targets (e.g. --max-age 70).
const MAX_AGE = Number(flag('max-age', 0)) || 0;
// --min-balance N: skip clients whose closing balance is under $N. Clients whose
// balance cannot be read are still drafted (and flagged) for manual review. Use
// to focus the campaign on accounts worth actively managing (e.g. --min-balance 100000).
const MIN_BALANCE = Number(flag('min-balance', 0)) || 0;
const CONCURRENCY = Number(flag('concurrency', 6)) || 6;
const MODEL = String(flag('model', env.anthropic.model || 'claude-sonnet-4-6'));

const TODAY = new Date('2026-07-06'); // fixed "as at" date for reproducible ages

// ---- helpers -----------------------------------------------------------------
const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

/** Parse a "22 Jun. 1984" style date and return age as at TODAY, or null. */
function ageFromText(text) {
  const m = text.match(/Date of birth:\s*(\d{1,2})\s+([A-Za-z]{3})[.\s]+(\d{4})/i);
  if (!m) return null;
  const d = Number(m[1]);
  const mon = MONTHS[m[2].toLowerCase().slice(0, 3)];
  const y = Number(m[3]);
  if (mon == null) return null;
  const dob = new Date(y, mon, d);
  let age = TODAY.getFullYear() - dob.getFullYear();
  const before = TODAY.getMonth() < dob.getMonth() ||
    (TODAY.getMonth() === dob.getMonth() && TODAY.getDate() < dob.getDate());
  if (before) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

/** Grab the closing balance if present. */
function closingBalance(text) {
  const m = text.match(/Closing balance[^$]*\$([\d,]+\.\d{2})/i);
  return m ? `$${m[1]}` : null;
}

/** True when every account for this client reads as nil / no activity. */
function isDormant(text) {
  const m = text.match(/Closing balance[^$]*\$([\d,]+\.\d{2})/i);
  const bal = m ? parseFloat(m[1].replace(/,/g, '')) : null;
  return bal === 0 || bal === null;
}

/**
 * Parse "Surname_Given Names_Number.pdf" into parts.
 * Company funds look like "Bobear Super Pty Ltd__52477312.pdf" (empty given).
 */
function parseName(file) {
  const base = file.replace(/\.pdf$/i, '');
  const parts = base.split('_');
  const account = parts.pop();
  const surname = parts.shift() || base;
  const given = parts.join(' ').trim();
  const isEntity = !given;
  const fullName = isEntity ? surname : `${given} ${surname}`;
  const firstName = isEntity ? surname : given.split(/\s+/)[0];
  const groupKey = `${surname}__${given}`.toLowerCase();
  return { surname, given, account, isEntity, fullName, firstName, groupKey };
}

const clamp = (s, n) => (s.length > n ? s.slice(0, n) + '\n…[truncated]…' : s);

// ---- prompt ------------------------------------------------------------------
const SYSTEM = [
  'You are Tristan Biro, a financial adviser at Pareto Group Pty Ltd (AFSL 418700), Authorised Representative No. 001313019.',
  'You are writing a SHORT, direct, personalised re-engagement email to a FORMER fee-paying client whose ongoing advice service has ceased.',
  'Because the service ceased, their superannuation has had NO active management — that is the core concern to open with.',
  'Your goal is to get them to book a review meeting so their affairs are actively managed again.',
  '',
  'TONE: warm but direct, confident, specific and URGENT. This is a real adviser who knows their numbers and is genuinely concerned that this has been left too long — NOT a generic marketing blast. No filler, no long preamble, no hedging clichés. Convey that acting now matters and that every year left unmanaged has a real, compounding cost.',
  '',
  'STRUCTURE:',
  '- "Subject:" line, then a blank line, then the body. The subject line must carry urgency and be specific to them (reference their super needing attention now).',
  '- Greet by first name.',
  '- Open: state plainly and early that our records show they are no longer a fee-paying client, and that AS A RESULT they have not been receiving ongoing advice and their super has been left running without active oversight or management. Name the real risk, state the balance, and make clear this is not something to keep putting off. Be direct and caring about it, not accusatory.',
  '- Then 4 to 6 CRITICAL, SPECIFIC areas from THEIR statement that need review. Each = a concrete observation grounded in their actual figures + why it matters + the tangible cost of leaving it + the value of addressing it. Go IN DEPTH: quote the specific option names, allocation percentages, dollar figures, salary, premiums and multi-year contribution figures from their statement. Where genuinely supported, spell out the cost of inaction (unused pre-tax room lost permanently at financial year end; premiums and fees quietly drawing the balance down every month; cover that may no longer fit). Draw ONLY from what the statement supports:',
  '   • Investment option and asset mix vs their age and retirement horizon — name the actual option(s) held and the growth/defensive split (e.g. 79% growth / 21% defensive), and question whether a default lifestage or employer-default option genuinely fits their goals rather than being left on autopilot.',
  '   • Contribution strategy — use their SALARY and their multi-year contribution history. The concessional cap for 2025-26 is $30,000. If they have only ever received employer Super Guarantee (no personal or salary-sacrifice contributions), state that plainly and quantify the unused pre-tax room this year, noting it is use-it-or-lose-it at 30 June and that on their salary a salary-sacrifice or personal deductible strategy is worth modelling.',
  '   • Insurance held inside super — itemise what they actually hold: each cover type (Death, TPD, Income Protection / Salary Continuance), the sum insured, and the monthly premium, plus the total annual premium cost. Flag specifics worth reviewing (e.g. a short 2-year income-protection benefit period, a long waiting period, or whether the sums insured still match their circumstances) and note the premiums erode the balance every month while unreviewed.',
  '   • Fees — quote the admin and investment fee amounts/percentages and note the ongoing drag if left unmanaged.',
  '   • If they hold more than one account, consolidation to stop paying duplicate fees and premiums month after month.',
  '   • Beneficiary nomination — frame as "we need to confirm your nomination is valid and current" (the statement does not show it); note an invalid or lapsed nomination can send their super to the wrong place.',
  '   • Age-based: at 55+ a transition-to-retirement and contribution strategy while there is still time to act; approaching or over 60 — pension-phase planning and retirement readiness, where the window to optimise is closing.',
  '- Close: the value of getting this actively managed again, the cost of continued delay, and a clear, TIME-BOUND call to action — ask to speak in the next few days / this week and offer to make it easy (a quick call to lock in a time). Create a sense that the sooner we meet, the more we can protect and improve.',
  '- Sign off with the signature block provided.',
  '',
  'HARD RULES:',
  '- Use ONLY facts present in the statement. NEVER invent or estimate figures, ages, product names or holdings. Use the verified Age and Balance given to you; do not recompute them.',
  '- Be specific with real dollar figures, option names, salary, premiums and their age throughout — detail is what makes the urgency credible rather than salesy.',
  '- Urgency must be grounded in genuine reasons (financial-year contribution deadlines, market risk sitting unmanaged, compounding cost of delay, premiums/fees drawing down monthly, insurance/beneficiary gaps). NEVER use false scarcity, fake deadlines, fear-mongering or pressure not supported by the facts.',
  '- Do NOT recommend a specific product, fund or switch, and do NOT promise an outcome or guaranteed return. Frame every area as "worth reviewing" / "we should assess" — the MEETING is the action, not a transaction.',
  'FORMATTING — the email must be CLEAN and ready to paste into Outlook:',
  '- Write in PLAIN TEXT only. NO markdown whatsoever: no asterisks, no **bold**, no ##, no backticks, no bullet characters like •. For the review areas, use a short bold-free label followed by a colon and then the sentences (e.g. "Your investment option: ..."), each area as its own short paragraph separated by a blank line. A simple numbered list (1., 2., 3.) is acceptable if it reads cleanly.',
  '- The source statement text may contain broken spacing from PDF extraction (e.g. "Salary Sacri ce", " gures", "pro les", "colonial rststate"). NEVER copy these artefacts. Always write every word correctly and in full ("salary sacrifice", "figures", "profile", etc.).',
  '- Write all dollar figures cleanly with a $ and thousands separators (e.g. $127,941.89). Do not output stray symbols, encoding artefacts, table fragments or column headers from the statement.',
  '- 380-520 words in the body — in depth but tight. Australian spelling. Return ONLY the subject line and the email body ending with the signature block. No preamble, no notes, no commentary, no markdown.',
].join('\n');

const SYSTEM_DORMANT = [
  'You are Tristan Biro, a financial adviser at Pareto Group Pty Ltd (AFSL 418700), Authorised Representative No. 001313019.',
  'You are writing a SHORT, warm, honest re-engagement email to a FORMER fee-paying client whose ongoing advice service has ceased.',
  'Their superannuation account ON OUR RECORDS now shows a NIL balance and no activity — which almost always means their super is now held elsewhere, or has become fragmented/lost.',
  '',
  'TONE: warm, direct, genuinely helpful. Do NOT invent balances, contributions, holdings or concerns — the account is empty; acknowledge that honestly.',
  '',
  'STRUCTURE:',
  '- "Subject:" line, then a blank line, then the body.',
  '- Greet by first name.',
  '- State plainly that they are no longer a fee-paying client and so have not been receiving ongoing advice, and that the super account we hold for them now shows a nil balance with no activity.',
  '- Explain what that usually means: their super is likely now held in another fund (or across several), possibly without active management, and there may be lost or unclaimed super.',
  '- Set out the value of a review: locating and consolidating their super, cutting duplicate fees, checking insurance held inside those funds, confirming a valid beneficiary nomination, and making sure their retirement savings are actually being managed. Use their age if provided to sharpen why this matters now.',
  '- Clear call to action to book a meeting; offer to make it easy (a quick call).',
  '- Sign off with the signature block provided.',
  '',
  'HARD RULES: Do NOT fabricate figures or specific concerns about this empty account. 150-250 words. Australian spelling. Return ONLY the subject line and email body.',
].join('\n');

const SIGNATURE = [
  'Kind regards,',
  '',
  'Tristan Biro',
  'Financial Adviser | Pareto Group Pty Ltd',
  'Authorised Representative No. 001313019 | AFSL 418700',
  'Ph: 03 9596 5111',
].join('\n');

const DISCLAIMER =
  'This email is factual information based on your current statement and is general in nature; ' +
  'it does not consider your full circumstances. Any specific recommendations would be provided ' +
  'in a Statement of Advice after a review.';

function buildUserContent({ fullName, firstName, age, balance, statements }) {
  const facts = [
    `Client: ${fullName}`,
    `First name (for greeting): ${firstName}`,
    `Verified age as at 6 July 2026: ${age != null ? age : 'not stated — do not guess'}`,
    `Verified current balance: ${balance || 'see statement'}`,
    `Number of accounts on file: ${statements.length}`,
  ].join('\n');

  // Super-access emphasis, split by where the client sits relative to
  // preservation age (60). This is the headline lever for this cohort, so it
  // must be a prominent, specific point in the email — not a throwaway line.
  let accessEmphasis = '';
  if (age != null && age >= 55 && age < 60) {
    // Runway to 60 — set the strategy up now so it is ready to switch on.
    accessEmphasis = [
      '',
      `STRATEGIC EMPHASIS — this client is ${age}, so they reach preservation age (60) in ${60 - age} year${60 - age === 1 ? '' : 's'}. Make this a prominent, specific point:`,
      '- The moment they turn 60 they can start accessing their super through a transition-to-retirement (TTR) pension while still working — reaching 60 is their "ticket to the game".',
      '- Explain plainly how this lets them orchestrate their pay: draw a tax-effective TTR pension from super (pension income is tax-free from 60) while salary-sacrificing more heavily into super — a combination that for many people delivers large tax savings each year without cutting their take-home pay.',
      '- Stress that the years between now and 60 are the set-up window: we should model and structure this NOW so it is ready to switch on the day they qualify, rather than leaving it to chance.',
      '- Keep it grounded: frame as "worth modelling" and a meeting outcome; do NOT promise specific dollar figures or guaranteed returns.',
    ].join('\n');
  } else if (age != null && age >= 60) {
    // Already past preservation age — the lever is available to use right now.
    accessEmphasis = [
      '',
      `STRATEGIC EMPHASIS — this client is ${age}, so they have ALREADY reached preservation age and can access their super now. Make this a prominent, specific point:`,
      '- They can access their superannuation today through a transition-to-retirement or account-based pension while still working — this is their "ticket to the game", and it is sitting unused.',
      '- Explain plainly how this lets them orchestrate their pay: draw a tax-effective pension from super (pension income is tax-free from 60) while salary-sacrificing into super — a combination that for many people delivers large tax savings each year while they keep working.',
      '- Stress the cost of delay: every year this sits unmanaged is a year of tax savings and optimisation left on the table — we should model and set this up now.',
      '- Keep it grounded: frame as "worth modelling" and a meeting outcome; do NOT promise specific dollar figures or guaranteed returns.',
    ].join('\n');
  }

  const body = statements
    .map((s, i) => `--- STATEMENT ${i + 1} (${s.account}) ---\n${clamp(s.text, 13000)}`)
    .join('\n\n');
  return `VERIFIED CLIENT FACTS (authoritative — use these, do not recompute):\n${facts}${accessEmphasis}\n\n` +
    `SUPER STATEMENT TEXT:\n${body}\n\n` +
    `Write the re-engagement email now. End the body with this signature block exactly:\n${SIGNATURE}`;
}

// ---- Anthropic ---------------------------------------------------------------
if (!env.anthropic.apiKey) {
  console.error('No ANTHROPIC_API_KEY in server/.env — cannot run.');
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey: env.anthropic.apiKey });

async function draftEmail(input) {
  const content = buildUserContent(input);
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system: input.dormant ? SYSTEM_DORMANT : SYSTEM,
        messages: [{ role: 'user', content }],
      });
      return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.statusCode;
      if (status === 429 || (status >= 500 && status < 600)) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1) * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ---- promise pool ------------------------------------------------------------
async function pool(items, size, worker) {
  const results = [];
  let idx = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

// ---- main --------------------------------------------------------------------
async function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  // For --retry-failed, load the prior manifest and collect the failed outfiles.
  let failedSet = null;
  if (RETRY_FAILED) {
    failedSet = new Set();
    const mPath = path.join(OUT, '_manifest.csv');
    if (existsSync(mPath)) {
      for (const r of readFileSync(mPath, 'utf8').split('\n').slice(1)) {
        if (!r.trim()) continue;
        const cols = r.replace(/^"/, '').replace(/"$/, '').split('","');
        const status = cols[1] || '';
        const outfile = cols[cols.length - 1] || '';
        if (status.startsWith('failed')) failedSet.add(outfile);
      }
    }
    console.log(`retry-failed: ${failedSet.size} previously-failed clients to retry\n`);
  }

  const files = readdirSync(INTAKE).filter((f) => f.toLowerCase().endsWith('.pdf'));

  // Group files per person (handles clients with multiple accounts).
  const groups = new Map();
  for (const file of files) {
    const meta = parseName(file);
    if (!groups.has(meta.groupKey)) groups.set(meta.groupKey, { meta, files: [] });
    groups.get(meta.groupKey).files.push(file);
  }

  let clients = [...groups.values()].sort((a, b) =>
    a.meta.fullName.localeCompare(b.meta.fullName));
  if (LIMIT) clients = clients.slice(0, LIMIT);

  console.log(`${files.length} statements -> ${clients.length} clients | model=${MODEL} | concurrency=${CONCURRENCY}${LIMIT ? ` | LIMIT=${LIMIT}` : ''}${FORCE ? ' | FORCE' : ''}\n`);

  const manifest = [['client', 'status', 'age', 'balance', 'accounts', 'outfile']];
  let done = 0, skipped = 0, flagged = 0, failed = 0;

  await pool(clients, CONCURRENCY, async ({ meta, files: cfiles }) => {
    const outName = `${meta.surname}_${meta.given || 'Fund'}`.replace(/[^\w\- ]/g, '').trim();
    const outPath = path.join(OUT, `${outName}.md`);

    if (RETRY_FAILED) {
      if (!failedSet.has(`${outName}.md`)) {
        skipped++;
        manifest.push([meta.fullName, 'skipped-ok', '', '', cfiles.length, `${outName}.md`]);
        return;
      }
      // else: fall through and regenerate this previously-failed client.
    } else if (REFRESH && !existsSync(outPath)) {
      // Draft was pruned earlier — leave it deleted.
      skipped++;
      manifest.push([meta.fullName, 'skipped-pruned', '', '', cfiles.length, `${outName}.md`]);
      return;
    } else if (!FORCE && !REFRESH && existsSync(outPath)) {
      skipped++;
      console.log(`  skip  ${meta.fullName}`);
      manifest.push([meta.fullName, 'skipped', '', '', cfiles.length, `${outName}.md`]);
      return;
    }

    // Extract every statement for this client.
    const statements = [];
    for (const f of cfiles) {
      try {
        const text = await extractText(readFileSync(path.join(INTAKE, f)), 'application/pdf', f);
        statements.push({ account: parseName(f).account, text });
      } catch (err) {
        statements.push({ account: parseName(f).account, text: '' });
      }
    }
    const joined = statements.map((s) => s.text).join('\n');
    const age = ageFromText(joined);
    const balance = closingBalance(joined);
    const dormant = isDormant(joined);

    // Age gate: skip anyone clearly under the minimum or over the maximum; keep
    // unknown-age for review.
    if (MIN_AGE && age != null && age < MIN_AGE) {
      skipped++;
      manifest.push([meta.fullName, `skipped-under-${MIN_AGE}`, age, balance ?? '', cfiles.length, `${outName}.md`]);
      return;
    }
    if (MAX_AGE && age != null && age > MAX_AGE) {
      skipped++;
      manifest.push([meta.fullName, `skipped-over-${MAX_AGE}`, age, balance ?? '', cfiles.length, `${outName}.md`]);
      return;
    }
    if ((MIN_AGE || MAX_AGE) && age == null) {
      console.log(`  ??    ${meta.fullName} — age unknown, drafting anyway (check manually)`);
    }

    // Balance gate: skip accounts below the minimum; keep unknown-balance for review.
    const balNum = balance != null ? parseFloat(String(balance).replace(/[$,]/g, '')) : null;
    if (MIN_BALANCE && balNum != null && !Number.isNaN(balNum) && balNum < MIN_BALANCE) {
      skipped++;
      const label = MIN_BALANCE >= 1000 ? `${MIN_BALANCE / 1000}k` : `${MIN_BALANCE}`;
      manifest.push([meta.fullName, `skipped-under-$${label}`, age ?? '', balance ?? '', cfiles.length, `${outName}.md`]);
      return;
    }
    if (MIN_BALANCE && balNum == null) {
      console.log(`  ??    ${meta.fullName} — balance unknown, drafting anyway (check manually)`);
    }

    if (joined.replace(/\s/g, '').length < 300) {
      flagged++;
      console.log(`  FLAG  ${meta.fullName} — little/no extractable text (scanned?)`);
      writeFileSync(outPath,
        `<!-- NEEDS MANUAL REVIEW: statement had little extractable text (possibly scanned image). -->\n` +
        `Client: ${meta.fullName}\nFiles: ${cfiles.join(', ')}\n`);
      manifest.push([meta.fullName, 'flagged-no-text', age ?? '', balance ?? '', cfiles.length, `${outName}.md`]);
      return;
    }

    try {
      const email = await draftEmail({
        fullName: meta.fullName, firstName: meta.firstName, age, balance, statements, dormant,
      });
      const header =
        `<!-- DRAFT for review — do not send without checking.${dormant ? ' [DORMANT/NIL ACCOUNT]' : ''} ` +
        `Client: ${meta.fullName} | Age: ${age ?? '?'} | Balance: ${balance ?? '?'} | ` +
        `Accounts: ${cfiles.length} (${cfiles.map((f) => parseName(f).account).join(', ')}) -->\n\n`;
      const footer = `\n\n---\n${DISCLAIMER}\n`;
      writeFileSync(outPath, header + email + footer);
      done++;
      console.log(`  ok    ${meta.fullName}  (age ${age ?? '?'}, ${balance ?? '?'})`);
      manifest.push([meta.fullName, dormant ? 'drafted-dormant' : 'drafted', age ?? '', balance ?? '', cfiles.length, `${outName}.md`]);
    } catch (err) {
      failed++;
      console.log(`  FAIL  ${meta.fullName} — ${err.message}`);
      manifest.push([meta.fullName, `failed: ${err.message}`, age ?? '', balance ?? '', cfiles.length, `${outName}.md`]);
    }
  });

  const csv = manifest.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  writeFileSync(path.join(OUT, '_manifest.csv'), csv);

  console.log(`\nDONE. drafted=${done} skipped=${skipped} flagged=${flagged} failed=${failed}`);
  console.log(`Output: ${OUT}`);
  console.log(`Manifest: ${path.join(OUT, '_manifest.csv')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
