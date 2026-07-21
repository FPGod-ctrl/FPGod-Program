import { query } from '../config/db.js';
import { completeOrStub, aiEnabled } from './ai.js';

const PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, annual: 1 };
const toAnnual = (a, f) => Number(a || 0) * (PER_YEAR[f] ?? 1);
const money = (n) => `$${Number(n || 0).toLocaleString()}`;

function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

/** All financial rows owned individually by one client. */
async function personFinancials(clientId) {
  const [current, recommended, assets, liabilities, income, expenses, insurance, goals, estate] = await Promise.all([
    query('SELECT * FROM current_investments WHERE client_id = $1 ORDER BY balance DESC', [clientId]).then((r) => r.rows),
    query('SELECT * FROM recommended_investments WHERE client_id = $1', [clientId]).then((r) => r.rows),
    query('SELECT * FROM assets WHERE client_id = $1 ORDER BY value DESC', [clientId]).then((r) => r.rows),
    query('SELECT * FROM liabilities WHERE client_id = $1 ORDER BY balance DESC', [clientId]).then((r) => r.rows),
    query('SELECT * FROM income_sources WHERE client_id = $1', [clientId]).then((r) => r.rows),
    query('SELECT * FROM expenses WHERE client_id = $1', [clientId]).then((r) => r.rows),
    query('SELECT * FROM insurance_policies WHERE client_id = $1', [clientId]).then((r) => r.rows),
    query('SELECT * FROM financial_goals WHERE client_id = $1', [clientId]).then((r) => r.rows),
    query('SELECT * FROM estate_plans WHERE client_id = $1', [clientId]).then((r) => r.rows[0] || null),
  ]);
  return { current, recommended, assets, liabilities, income, expenses, insurance, goals, estate };
}

/**
 * Assemble the FULL client/household context: every member with their complete
 * financial breakdown, plus joint household items.
 */
export async function gatherClientContext(clientId) {
  const { rows: [client] } = await query('SELECT * FROM clients WHERE id = $1', [clientId]);
  if (!client) return null;

  const group = client.group_id
    ? await query('SELECT * FROM client_groups WHERE id = $1', [client.group_id]).then((r) => r.rows[0])
    : null;

  let members = [client];
  let joint = null;
  if (client.group_id) {
    const { rows } = await query('SELECT * FROM clients WHERE group_id = $1 ORDER BY created_at ASC', [client.group_id]);
    if (rows.length) members = rows;
    const jq = (t, o) => query(`SELECT * FROM ${t} WHERE group_id = $1 AND client_id IS NULL ORDER BY ${o}`, [client.group_id]).then((r) => r.rows);
    const [assets, liabilities, income, expenses, insurance, goals, current] = await Promise.all([
      jq('assets', 'value DESC'), jq('liabilities', 'balance DESC'), jq('income_sources', 'amount DESC'),
      jq('expenses', 'amount DESC'), jq('insurance_policies', 'cover_amount DESC NULLS LAST'),
      jq('financial_goals', 'target_date ASC NULLS LAST'), jq('current_investments', 'balance DESC'),
    ]);
    joint = { assets, liabilities, income, expenses, insurance, goals, current };
  }

  const people = await Promise.all(members.map(async (m) => ({ client: m, ...(await personFinancials(m.id)) })));

  // Uploaded source documents across the whole household, so the AI can read
  // the actual client files (statements, profiles, spreadsheets) directly.
  const memberIds = members.map((m) => m.id);
  const { rows: documents } = await query(
    `SELECT id, original_name, doc_type, client_id, group_id, extracted_text
       FROM documents
      WHERE (client_id = ANY($1) OR group_id = $2)
        AND extracted_text IS NOT NULL AND extracted_text <> ''
      ORDER BY created_at DESC`,
    [memberIds, client.group_id || null]
  );

  return { client, group, people, joint, documents };
}

// ---------------------------------------------------------------------------
// Render context to text
// ---------------------------------------------------------------------------
function section(lines, title, rows, fmt) {
  if (rows && rows.length) {
    lines.push(`- ${title}:`);
    rows.forEach((r) => lines.push(`   • ${fmt(r)}`));
  }
}

function financialsToLines(L, p) {
  section(L, 'Assets', p.assets, (r) => `${r.name} (${r.category}) ${money(r.value)}${r.owner ? ` [${r.owner}]` : ''}`);
  section(L, 'Investments', p.current, (r) => `${r.fund_name} ${r.account_type || ''} ${money(r.balance)} ${r.allocation_pct ?? '?'}% fee ${r.fee_pct ?? '?'}%`);
  section(L, 'Liabilities', p.liabilities, (r) => `${r.name} (${r.liability_type}) ${money(r.balance)}${r.interest_rate ? ` @ ${r.interest_rate}%` : ''}${r.monthly_payment ? `, ${money(r.monthly_payment)}/mo` : ''}`);
  section(L, 'Income', p.income, (r) => `${r.name} (${r.income_type}) ${money(r.amount)}/${r.frequency} = ${money(toAnnual(r.amount, r.frequency))}/yr`);
  section(L, 'Expenses', p.expenses, (r) => `${r.name} (${r.category}) ${money(r.amount)}/${r.frequency} = ${money(toAnnual(r.amount, r.frequency))}/yr`);
  section(L, 'Insurance', p.insurance, (r) => `${r.policy_type}${r.provider ? ` - ${r.provider}` : ''} cover ${money(r.cover_amount)}${r.premium ? `, premium ${money(r.premium)}/${r.frequency}` : ''}`);
  section(L, 'Goals', p.goals, (r) => `${r.name}${r.target_amount ? ` target ${money(r.target_amount)}` : ''}${r.target_date ? ` by ${String(r.target_date).slice(0, 10)}` : ''}`);
  if (p.estate) {
    const e = p.estate; const bits = [];
    if (e.has_will) bits.push(`Will${e.executor ? ` (executor ${e.executor})` : ''}`);
    if (e.has_poa) bits.push(`POA${e.poa_type ? ` (${e.poa_type})` : ''}`);
    if (e.has_testamentary_trust) bits.push('Testamentary trust');
    if (e.beneficiaries) bits.push(`Beneficiaries: ${e.beneficiaries}`);
    if (bits.length) L.push(`- Estate: ${bits.join(', ')}`);
  }
}

function contextToText(ctx) {
  const L = [];
  if (ctx.group) L.push(`Household: ${ctx.group.name} (${ctx.group.group_type})`);

  ctx.people.forEach((p) => {
    const c = p.client;
    const a = ageFrom(c.date_of_birth);
    L.push(`\n### ${c.first_name} ${c.last_name}`);
    if (c.address) L.push(`- Address: ${c.address}`);
    if (c.email) L.push(`- Email: ${c.email}`);
    if (c.phone) L.push(`- Phone: ${c.phone}`);
    if (c.occupation) L.push(`- Occupation: ${c.occupation}`);
    if (c.date_of_birth) L.push(`- DOB: ${String(c.date_of_birth).slice(0, 10)}${a != null ? ` (age ${a})` : ''}`);
    if (c.risk_profile) L.push(`- Risk profile: ${c.risk_profile}`);
    if (c.annual_income) L.push(`- Annual income (profile): ${money(c.annual_income)}`);
    if (c.partner_first_name || c.partner_last_name) {
      const pa = ageFrom(c.partner_date_of_birth);
      L.push(`- Partner / Spouse: ${[c.partner_first_name, c.partner_last_name].filter(Boolean).join(' ')}`
        + (c.partner_occupation ? `, ${c.partner_occupation}` : '')
        + (c.partner_date_of_birth ? `, DOB ${String(c.partner_date_of_birth).slice(0, 10)}${pa != null ? ` (age ${pa})` : ''}` : '')
        + (c.partner_risk_profile ? `, risk ${c.partner_risk_profile}` : '')
        + (c.partner_annual_income ? `, income ${money(c.partner_annual_income)}` : ''));
      if (c.partner_email) L.push(`- Partner email: ${c.partner_email}`);
    }
    financialsToLines(L, p);
  });

  if (ctx.joint) {
    const j = ctx.joint;
    const any = ['assets', 'liabilities', 'income', 'expenses', 'insurance', 'goals', 'current'].some((k) => j[k]?.length);
    if (any) {
      L.push('\n### Joint / Household');
      financialsToLines(L, j);
    }
  }

  // Household totals.
  const sum = (arr, key) => (arr || []).reduce((s, r) => s + Number(r[key] || 0), 0);
  const annual = (arr) => (arr || []).reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0);
  let totA = 0; let totL = 0; let totInc = 0; let totExp = 0;
  const buckets = [...ctx.people, ...(ctx.joint ? [ctx.joint] : [])];
  for (const p of buckets) {
    totA += sum(p.assets, 'value') + sum(p.current, 'balance');
    totL += sum(p.liabilities, 'balance');
    totInc += annual(p.income);
    totExp += annual(p.expenses);
  }
  L.push(`\nHousehold totals — Assets ${money(totA)}, Liabilities ${money(totL)}, Net worth ${money(totA - totL)}, Annual income ${money(totInc)}, Annual expenses ${money(totExp)}, Surplus ${money(totInc - totExp)}.`);

  // Extracts from the actual uploaded client documents (capped for length).
  if (ctx.documents && ctx.documents.length) {
    L.push('\n### Source documents (extracts from uploaded client files)');
    const ownerName = (doc) => {
      const p = ctx.people.find((x) => x.client.id === doc.client_id);
      return p ? `${p.client.first_name} ${p.client.last_name}` : 'Joint / Household';
    };
    let budget = 12000;
    for (const doc of ctx.documents) {
      if (budget <= 0) { L.push('\n- …(further documents omitted for length)'); break; }
      const text = (doc.extracted_text || '').slice(0, Math.min(3000, budget)).trim();
      budget -= text.length;
      L.push(`\n**${doc.original_name}** (${doc.doc_type}, ${ownerName(doc)}):`);
      L.push(`"""\n${text}\n"""`);
    }
  }

  return L.join('\n');
}

// ---------------------------------------------------------------------------
// Training-example selection: master template + relevance-matched references
// ---------------------------------------------------------------------------
const TOPICS = [
  'smsf', 'transition to retirement', 'ttr', 'retirement', 'superannuation', 'super',
  'surplus', 'estate', 'insurance', 'property', 'defined benefit', 'centrelink',
  'tax', 'salary sacrifice', 'redundancy', 'pension', 'investment structure',
  'contribution', 'gifting', 'cash flow',
];

function deriveTopics(ctx, instructions) {
  const hay = [(instructions || '').toLowerCase()];
  for (const p of ctx.people) {
    const c = p.client;
    if (c.occupation) hay.push(c.occupation.toLowerCase());
    p.goals.forEach((g) => hay.push((g.name || '').toLowerCase()));
    p.assets.forEach((x) => hay.push(`${x.name} ${x.category}`.toLowerCase()));
    if (p.insurance.length) hay.push('insurance');
    if (p.estate && (p.estate.has_will || p.estate.has_testamentary_trust)) hay.push('estate');
    const a = ageFrom(c.date_of_birth);
    if (a != null && a >= 55) hay.push('retirement transition to retirement ttr pension');
    if (a != null && a >= 50) hay.push('superannuation contribution salary sacrifice');
  }
  hay.push('superannuation investment structure retirement'); // baseline
  const text = hay.join(' ');
  return TOPICS.filter((t) => text.includes(t));
}

const excerpt = (text, n) => {
  const t = text || '';
  return t.length > n ? `${t.slice(0, n)}\n…[truncated]` : t;
};

async function selectExamples(ctx, instructions, max = 2) {
  const { rows: [tpl] } = await query(
    `SELECT id, title, content FROM training_data
      WHERE kind = 'plan' AND metadata->>'is_template' = 'true'
      ORDER BY updated_at DESC LIMIT 1`
  );
  const topics = deriveTopics(ctx, instructions);

  const { rows: cands } = await query(
    `SELECT id, title, content FROM training_data
      WHERE kind = 'plan' AND COALESCE(metadata->>'is_template', '') <> 'true'
      ORDER BY created_at DESC`
  );
  const scored = cands
    .map((p) => {
      const t = (p.title || '').toLowerCase();
      const score = topics.reduce((s, topic) => s + (t.includes(topic) ? 1 : 0), 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score); // stable: ties keep recency order

  const picked = scored.filter((s) => s.score > 0).slice(0, max).map((s) => s.p);
  for (const s of scored) { // top up with most-recent if too few matched
    if (picked.length >= max) break;
    if (!picked.includes(s.p)) picked.push(s.p);
  }
  return { tpl, examples: picked, topics };
}

// ---------------------------------------------------------------------------
// Calculation-integrity guardrails. The model is told to "show worked numbers"
// like the template, but without explicit rules it free-hands tax/super maths
// and produces plausible-but-wrong figures (e.g. ignoring the s307-125
// proportioning rule on a super withdrawal). These rules are injected into every
// generation prompt and a mandatory self-check forces the model to verify each
// figure before output. THRESHOLDS BELOW ARE DATE-SENSITIVE — review each FY.
export const CALC_GUARDRAILS =
  'CALCULATION INTEGRITY — these rules are MANDATORY and override the template if it shows a calculation done differently:\n'
  + '1. Show the working for every dollar figure you derive. After any table of components or any tax figure, RE-CHECK it before writing: the parts must sum to the stated total, and every tax amount must equal the rate applied to the correct base. If a check fails, fix the numbers — never output a figure you have not verified.\n'
  + '2. Superannuation proportioning rule (ITAA 1997 s307-125): every super lump sum, withdrawal or rollover is drawn from the tax-free and taxable components in the SAME proportion they bear to the whole interest. NEVER assume a withdrawal comes wholly or disproportionately from the taxable component. (E.g. withdrawing from an interest that is 95% taxable removes 95% taxable / 5% tax-free — not 100% taxable.)\n'
  + '3. Re-contribution strategy: a non-concessional re-contribution is 100% tax-free component, but the preceding withdrawal is proportional (rule 2). Recompute BOTH components from the proportioning rule; do not subtract the whole withdrawal from the taxable component.\n'
  + '4. Super death benefits tax — taxed element of the taxable component paid to a non-dependant: 15% + 2% Medicare = 17% if paid directly from the fund, or 15% (no Medicare) if paid via the deceased estate. The tax-free component is always nil-taxed. State which payment path you assume.\n'
  + '5. Non-concessional contributions (NCC) cap & bring-forward — use the cap for the financial year the contribution falls in: 2024-25 and 2025-26 = $120,000/yr (3-year bring-forward $360,000); from 1 July 2026 = $130,000/yr (3-year bring-forward $390,000). Bring-forward also needs age < 75 on 1 July of the trigger year and a Total Super Balance under the threshold. Flag any figure that changes at a 1 July boundary near the advice date.\n'
  + '6. CGT main residence exemption: covers the dwelling plus adjacent land up to 2 hectares TOTAL including the land under the dwelling (ITAA 1997 s118-120). For land over 2 ha, you select which 2 ha is exempt and apportion the remainder by relative VALUE where parts can be separately valued (otherwise by area), and the split must be reasonable (TD 1999/67). Individuals get the 50% CGT discount on assets held > 12 months.\n'
  + '7. Every tax, CGT, super or projection figure is ILLUSTRATIVE: state the assumptions it rests on, mark it [ADVISOR TO CONFIRM], and never present it as a guaranteed outcome.';

const SYSTEM_PROMPT =
  'You are a senior Australian financial planner writing a Statement of Advice (SOA). ' +
  'A MASTER TEMPLATE plan is provided: mirror its structure, section order, headings, tone, ' +
  'formatting and level of detail as closely as possible, adapting all content to THIS client/household. ' +
  'Use the strategies demonstrated in the template and reference plans where they suit the client ' +
  '(e.g. superannuation contribution strategies, salary sacrifice, transition to retirement, SMSF, ' +
  'investment structures, surplus funds, insurance, Centrelink, estate planning) — but NEVER invent ' +
  'figures that are not supported by the client data. Write in Markdown, be comprehensive and specific, ' +
  'and show calculations/projections where the template does. Where genuine adviser judgement or a figure ' +
  'you cannot derive is needed, insert a clearly-marked [ADVISOR TO CONFIRM] placeholder. Use Australian ' +
  'terminology and AUD. Do NOT use US concepts (401k, IRA, Roth, HSA). '
  + 'CRITICAL: never fabricate the client\'s personal details. If a client address, date of birth, contact '
  + 'detail, account number, or similar is not provided in the client data above, write [ADVISOR TO CONFIRM] '
  + 'rather than inventing one. You MAY reproduce the adviser/firm letterhead and disclaimers from the master '
  + 'template (that is the advising firm\'s own branding), but all CLIENT-specific facts must come only from the '
  + 'supplied client data or be marked [ADVISOR TO CONFIRM]. For the document\'s preparation date, use the '
  + 'supplied "Date of advice" — never copy a date from the template.\n\n'
  + CALC_GUARDRAILS;

const QUESTION_SYSTEM_PROMPT =
  'You are a senior Australian financial planner. Before writing a Statement of Advice you must review the '
  + 'client/household file and identify the key questions to ask the adviser — the decisions, missing facts, '
  + 'goals, preferences and assumptions that materially change the advice (e.g. target retirement age, income '
  + 'needs in retirement, risk tolerance confirmation, priorities between goals, appetite for SMSF, contribution '
  + 'amounts, insurance needs, Centrelink/age pension considerations, time horizons, any constraints). '
  + 'Base questions on what is MISSING or AMBIGUOUS in the supplied data — do not ask what is already answered. '
  + 'Return JSON only: {"questions":[{"question":"...","why":"short reason it matters","suggestion":"a sensible default answer the adviser can accept or edit"}]}. '
  + 'Return the 5-8 most important questions. Do NOT write the plan.';

/**
 * Review the client file and return clarifying questions for the adviser to
 * answer before the plan is written.
 */
export async function generateQuestions(ctx, instructions = '') {
  const { tpl, topics } = await selectExamples(ctx, instructions);
  const userContent =
    `Client/household file:\n${contextToText(ctx)}\n\n`
    + `Detected focus areas: ${topics.join(', ') || 'general'}.`
    + (tpl ? `\n\nThe plan will follow the structure/style of the master template "${tpl.title}".` : '')
    + (instructions ? `\n\nAdviser instructions: ${instructions}` : '');

  const stub = () => JSON.stringify({
    questions: [
      { question: 'What is the target retirement age (or date) for each person?', why: 'Drives projections and contribution strategy.', suggestion: 'Age 65' },
      { question: 'What annual after-tax income do they want in retirement (in today\'s dollars)?', why: 'Sets the income goal the plan must fund.', suggestion: '$80,000 p.a.' },
      { question: 'What are their top financial goals and the priority order?', why: 'Shapes recommendations and trade-offs.', suggestion: 'Maximise retirement income, then reduce debt' },
      { question: 'Is the risk profile on file confirmed, or should capacity vs. tolerance be reviewed?', why: 'Determines asset allocation.', suggestion: 'Confirmed as recorded' },
      { question: 'Any appetite for establishing/using an SMSF?', why: 'Affects super structure advice.', suggestion: 'Open to it if beneficial' },
    ],
  });

  const { text, ai } = await completeOrStub(
    {
      messages: [
        { role: 'system', content: QUESTION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      json: true,
      maxTokens: 1500,
    },
    stub
  );

  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { questions: [] }; }
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  return { questions, ai };
}

/**
 * Generate a financial plan from full client context + the master template and
 * relevance-matched historical plans, incorporating the adviser's answers to
 * the clarifying questions.
 */
export async function generatePlan(ctx, instructions = '', answers = null) {
  const { tpl, examples, topics } = await selectExamples(ctx, instructions);

  const parts = [];
  if (tpl) {
    parts.push(
      'MASTER TEMPLATE — this is the BLUEPRINT. You MUST reproduce its section headings in the SAME order, '
      + 'its tone, formatting, tables and depth, populating every section with THIS client/household\'s data and '
      + 'appropriate strategies. Do not drop sections. The full template follows:\n'
      + `Title: ${tpl.title}\n"""\n${excerpt(tpl.content, 100000)}\n"""`
    );
  }
  // When a master template is set, lean primarily on it; keep references brief.
  if (examples.length) {
    parts.push('ADDITIONAL REFERENCE PLANS — for relevant strategies only (do not copy their structure):');
    examples.forEach((e, i) => parts.push(`Reference ${i + 1} (${e.title}):\n"""\n${excerpt(e.content, tpl ? 4000 : 7000)}\n"""`));
  }

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const answerBlock = Array.isArray(answers) && answers.length
    ? `\n\nThe adviser has answered the following clarifying questions — treat these as confirmed decisions and build the advice around them:\n${answers
      .filter((a) => a && a.answer && String(a.answer).trim())
      .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
      .join('\n\n')}`
    : '';

  const userContent =
    `${parts.join('\n\n')}\n\n`
    + `Detected focus areas: ${topics.join(', ') || 'general'}.\n\n`
    + `Date of advice — use THIS as the document's "Prepared on" / preparation date (do NOT copy the template's date): ${today}.\n\n`
    + `Now write a complete Statement of Advice style financial plan for the following client/household:\n${contextToText(ctx)}`
    + answerBlock
    + (instructions ? `\n\nAdditional advisor instructions: ${instructions}` : '');

  const out = await completeOrStub(
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      maxTokens: 14000,
    },
    () => buildStubPlan(ctx)
  );
  return { ...out, text: stripCodeFence(out.text) };
}

// Some models wrap the whole document in a ```markdown ... ``` fence; unwrap it
// so it renders as a formatted plan, not a grey code block.
function stripCodeFence(s) {
  if (!s) return s;
  const t = s.trim();
  const m = t.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return m ? m[1].trim() : s;
}

// ---------------------------------------------------------------------------
// Section-by-section generation — a single AI call can't produce a 60-page SOA,
// so we split the master template into its sections and write each one at full
// depth (adapted to the client), then assemble the whole document.
// ---------------------------------------------------------------------------
function splitTemplateSections(content) {
  const text = content || '';
  const re = /(?:^|\n)[ \t]*(\d{1,2})\.[ \t]+([A-Z][^\n]{2,80})(?=\n)/g;
  const marks = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const at = m.index + (text[m.index] === '\n' ? 1 : 0);
    marks.push({ index: at, title: `${m[1]}. ${m[2].trim()}` });
  }
  if (marks.length < 3 || marks.length > 45) return []; // not a recognisable section structure
  const sections = [];
  const cover = text.slice(0, marks[0].index).trim();
  if (cover) sections.push({ title: 'Cover, scope & summary', text: cover });
  for (let j = 0; j < marks.length; j += 1) {
    const end = j + 1 < marks.length ? marks[j + 1].index : text.length;
    sections.push({ title: marks[j].title, text: text.slice(marks[j].index, end).trim() });
  }
  return sections;
}

// Run async work over items with a concurrency cap (keeps total time + cost sane).
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next; next += 1;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

const sectionSystemPrompt = (tplTitle) =>
  `You are a senior Australian financial planner writing ONE section of a comprehensive Statement of Advice titled "${tplTitle}". `
  + 'Write ONLY the requested section, in Markdown. Mirror the template section\'s structure, sub-headings, tables and depth, but populate everything with THIS client/household\'s real data and figures. '
  + 'Apply and explain the strategies the template section demonstrates wherever they suit the client; if a strategy or sub-section genuinely does not apply, say so in one line rather than dropping it. '
  + 'Show the same kind of worked numbers, tables and legislative references the template uses, adapted to the client. '
  + 'NEVER fabricate the client\'s personal facts — write [ADVISOR TO CONFIRM] for anything not supplied. Use Australian terminology, AUD and current FY thresholds; do NOT use US concepts. Do NOT wrap the output in code fences.\n\n'
  + CALC_GUARDRAILS;

async function generateSection(sec, contextText, instructions, today, tplTitle) {
  const userContent =
    `TEMPLATE SECTION (follow its structure, headings, tables and depth):\n"""\n${excerpt(sec.text, 9000)}\n"""\n\n`
    + `CLIENT / HOUSEHOLD DATA:\n${contextText}\n\n`
    + `Date of advice (use for any preparation date): ${today}.`
    + (instructions ? `\n\nAdviser instructions: ${instructions}` : '')
    + `\n\nNow write the section "${sec.title}" for this client/household.`;
  const { text } = await completeOrStub(
    {
      messages: [
        { role: 'system', content: sectionSystemPrompt(tplTitle) },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      maxTokens: 4000,
    },
    () => `## ${sec.title}\n\n_[Offline stub — set ANTHROPIC_API_KEY for AI generation.]_`
  );
  return stripCodeFence(text);
}

/**
 * Generate a full-length plan section-by-section so it matches the master
 * template's depth. Falls back to single-pass generation when AI is off or
 * there is no usable template structure.
 */
export async function generatePlanSectioned(ctx, instructions = '') {
  const { rows: [tpl] } = await query(
    `SELECT title, content FROM training_data WHERE kind = 'plan' AND metadata->>'is_template' = 'true' ORDER BY updated_at DESC LIMIT 1`
  );
  const sections = tpl ? splitTemplateSections(tpl.content) : [];
  if (!aiEnabled() || !tpl || sections.length < 3) {
    return generatePlan(ctx, instructions); // single-pass / stub fallback
  }

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const contextText = contextToText(ctx);

  const parts = await mapLimit(sections, 5, (sec) => generateSection(sec, contextText, instructions, today, tpl.title));
  return { text: parts.filter(Boolean).join('\n\n'), ai: true };
}

function buildStubPlan(ctx) {
  const c = ctx.client;
  const self = ctx.people.find((p) => p.client.id === c.id) || ctx.people[0] || { current: [], assets: [] };
  const totalBalance = (self.current || []).reduce((s, i) => s + Number(i.balance || 0), 0)
    + (self.assets || []).reduce((s, a) => s + Number(a.value || 0), 0);
  return `# Financial Plan — ${c.first_name} ${c.last_name}

> _Generated in offline stub mode (no Anthropic key configured). Set ANTHROPIC_API_KEY for full AI generation._

## Executive Summary
This plan outlines a ${c.risk_profile || 'balanced'} strategy for ${c.first_name} ${c.last_name}, with assets of approximately ${money(totalBalance)}.

## Goals & Objectives
- [ADVISOR TO CONFIRM] Primary financial goals and target retirement age.

## Current Position
${(self.assets || []).map((a) => `- ${a.name}: ${money(a.value)}`).join('\n') || '- No assets on file yet.'}

## Recommendations
1. Review superannuation structure and contribution capacity.
2. Optimise asset allocation to the stated risk profile.

## Next Steps
- [ADVISOR TO CONFIRM] Schedule implementation meeting.
`;
}

export default { generatePlan, gatherClientContext };
