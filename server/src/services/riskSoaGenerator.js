import { query } from '../config/db.js';
import { aiEnabled, completeOrStub } from './ai.js';
import { contextToText, stripCodeFence } from './planGenerator.js';
import { env } from '../config/env.js';
import { LEGACY_SECTIONS, houseWordingFor, resolveWordingRef, PLACEHOLDER } from './legacySoaStructure.js';
import { formatAuDate } from './planRender.js';

/**
 * Risk-only Statement of Advice generator (Legacy Risk Advice).
 *
 * Deliberately separate from the general financial-plan generator: this firm
 * writes risk insurance advice only, so the section structure, guardrails and
 * system prompt are all insurance-specific. Superannuation and investment
 * strategy appear only where they bear on cover ownership or premium funding.
 *
 * Structure comes from the firm's own SOA template once one has been imported
 * (training_data, kind='plan', metadata.doc_type='risk_soa', is_template=true).
 * Until then it falls back to LEGACY_SECTIONS — the firm's own house structure,
 * derived from 32 completed SOAs (see legacySoaStructure.js).
 */

// ---------------------------------------------------------------------------
// Compliance + calculation guardrails specific to risk advice. These are
// injected into every section prompt and override the template where the
// template does something different. THRESHOLDS ARE DATE-SENSITIVE.
// ---------------------------------------------------------------------------
export const RISK_GUARDRAILS =
  'RISK ADVICE INTEGRITY — these rules are MANDATORY and override the template if it does something different:\n'
  + '1. NEVER state a premium, sum insured, occupation rating, loading or underwriting outcome that was not supplied in the client data or the adviser notes. Write [ADVISER TO CONFIRM] instead. Premiums are indicative until the insurer confirms them in writing.\n'
  + '2. NEEDS ANALYSIS: the adviser notes record whether a full Insurance Needs Analysis (INA) was done. (a) If they say NO INA was done (client-directed cover), use the house client-directed wording and the Incomplete INA warning (the needs-analysis-position blocks supplied with the Insurance recommendations section) — this is the only case in which that wording appears. (b) If they say an INA WAS done, give the REASONS for each recommended sum insured in prose against the client\'s debts, income, dependants, existing cover and stated objectives; do not print a component table that sums to the figure, and do not use the client-directed or "declined" wording. (c) If the notes are silent, do not assume either way: write "[ADVISER TO CONFIRM] Was a full Insurance Needs Analysis done for this client?" and neither say one was declined nor claim one was done. Any figure you do state must be arithmetically correct and consistent with the client data.\n'
  + '3. Ownership and structure must be stated for every recommended policy, with the tax consequence:\n'
  + '   - Life inside super: premiums are generally deductible to the fund, but a lump sum paid to a NON-tax-dependant is taxed on the taxable component (15% plus Medicare where applicable). Name the likely beneficiary and their dependant status.\n'
  + '   - TPD inside super: must satisfy a condition of release, so "any occupation" definition only. "Own occupation" TPD cannot be held inside super for policies issued from 1 July 2014.\n'
  + '   - Trauma / critical illness: CANNOT be held inside superannuation (it does not meet a SIS condition of release). Always recommend trauma cover outside super.\n'
  + '   - Income protection inside super: restricted to indemnity-style benefits, narrower definitions, and most ancillary benefits are unavailable. Outside super, premiums are generally tax-deductible to the individual.\n'
  + '4. REPLACEMENT OF EXISTING COVER: where a recommendation replaces or cancels existing cover you MUST include an explicit warning that the client must NOT cancel the existing policy until the new cover is confirmed in force and any exclusions or loadings are known; and you MUST compare old against new across definitions, waiting and benefit periods, exclusions, loadings, premium structure and any loss of loyalty or guaranteed-renewability benefits. Replacement-only warnings (suicide exclusion, three-year avoidance period, health check, continuity) appear ONLY where existing cover is replaced, cancelled or reduced — never on brand-new cover.\n'
  + '5. Refer to the duty to take reasonable care not to make a misrepresentation (Insurance Contracts Act 1984, as amended from 5 October 2021 for consumer insurance contracts) — NOT the superseded "duty of disclosure" wording.\n'
  + '6. State whether each premium is STEPPED or LEVEL and explain the long-run cost difference. Where affordability is a stated concern, address it explicitly rather than assuming it away.\n'
  + '7. Cover is not in force until the insurer accepts the application and confirms it. Underwriting may result in loadings, exclusions or decline — state this; never present acceptance as certain.\n'
  + '8. Disclose remuneration: adviser service fee and/or insurance commission (upfront and ongoing), in dollars where known, otherwise [ADVISER TO CONFIRM]. Mark clearly where a figure is illustrative.\n'
  + '9. Use Australian terminology and AUD throughout. NEVER use US concepts (401k, IRA, Roth, HSA) or US insurance terms.\n'
  + '10. Never fabricate the client\'s personal details — name, date of birth, address, occupation, income, health or smoker status, existing policy numbers. If not supplied, write [ADVISER TO CONFIRM].\n'
  + `11. FIRM IDENTITY — use these details and no others:\n`
  + `    Adviser: ${env.adviser.name}${env.adviser.ar ? `, Authorised Representative No. ${env.adviser.ar}` : ', Authorised Representative No. [ADVISER TO CONFIRM]'}\n`
  + `    Firm: ${env.firm.legalName} ${env.firm.ar}, ABN ${env.firm.abn}\n`
  + `    ${env.firm.address}\n`
  + `    Authorised Representative of ${env.firm.licensee}, AFSL ${env.firm.licenseeAfsl}, ABN ${env.firm.licenseeAbn}\n`
  + `    ${env.firm.legalName} is a corporate Authorised Representative — the AFSL belongs to the licensee, never to the firm. Never describe the firm as holding an AFSL.\n`
  + `    Example documents in this system were written by OTHER advisers at this firm and by a PREVIOUS practice. Use them for structure, tone and house wording ONLY. Never reproduce another adviser's name, AR number or contact details, and never another firm's licensee or AFSL — issuing advice under the wrong licensee is a compliance breach. Where a detail is not given above, write [ADVISER TO CONFIRM].\n`
  + '12. Never carry a client name, figure, policy or personal detail across from a reference document or template example into this client\'s advice.';


const SECTION_SYSTEM_PROMPT = (templateTitle) =>
  'You are a senior Australian risk insurance adviser writing ONE section of a Statement of Advice for a '
  + 'risk-only advice practice (life, TPD, trauma and income protection). '
  + (templateTitle
    ? `You are following the firm's own SOA template, "${templateTitle}". Mirror that section's structure, sub-headings, tables, tone and depth exactly, but populate everything with THIS client's real data. `
    : 'Write in plain English addressed directly to the client as "you" — professional but warm, with the reasoning spelled out rather than asserted. Use Markdown tables wherever figures are compared. ')
  + 'Write ONLY the requested section, in Markdown, starting with the section heading. '
  + 'Do NOT write investment, retirement-projection or broad superannuation strategy advice — this practice advises on risk insurance only. Superannuation appears only where it is the ownership vehicle for cover or the means of funding a premium. '
  + 'Where genuine adviser judgement or a figure you cannot derive is required, insert a clearly-marked [ADVISER TO CONFIRM] placeholder rather than guessing. '
  + 'Do NOT wrap the output in code fences.\n\n'
  + RISK_GUARDRAILS;

/** Load the firm's risk SOA master template, if one has been imported. */
export async function loadRiskTemplate() {
  const { rows: [tpl] } = await query(
    `SELECT title, content FROM training_data
      WHERE kind = 'plan'
        AND metadata->>'doc_type' = 'risk_soa'
        AND metadata->>'is_template' = 'true'
      ORDER BY updated_at DESC LIMIT 1`
  );
  return tpl || null;
}

/**
 * Split an imported SOA template into sections on numbered headings, the same
 * way the plan generator does, so the firm's own structure drives the output.
 */
function splitTemplateSections(content) {
  const text = content || '';
  const re = /(?:^|\n)[ \t]*(\d{1,2})\.[ \t]+([A-Z][^\n]{2,80})(?=\n)/g;
  const marks = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const at = m.index + (text[m.index] === '\n' ? 1 : 0);
    marks.push({ index: at, title: `${m[1]}. ${m[2].trim()}` });
  }
  if (marks.length < 3 || marks.length > 45) return [];
  const sections = [];
  const cover = text.slice(0, marks[0].index).trim();
  if (cover) sections.push({ title: 'Cover, scope and summary', text: cover });
  for (let j = 0; j < marks.length; j += 1) {
    const end = j + 1 < marks.length ? marks[j + 1].index : text.length;
    sections.push({ title: marks[j].title, text: text.slice(marks[j].index, end).trim() });
  }
  return sections;
}

/**
 * Run async work with a concurrency cap, so a 14-section SOA stays affordable.
 * `onDone` fires as each item finishes — sections complete out of order at
 * concurrency 5, so it reports a running count rather than a position.
 */
async function mapLimit(items, limit, fn, onDone) {
  const out = new Array(items.length);
  let next = 0;
  let finished = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next; next += 1;
      out[idx] = await fn(items[idx], idx);
      finished += 1;
      if (onDone) onDone({ done: finished, total: items.length, title: items[idx].title });
    }
  });
  await Promise.all(workers);
  return out;
}

const excerpt = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '');

async function writeSection(sec, contextText, instructions, today, templateTitle) {
  const guidance = sec.text
    ? `TEMPLATE SECTION (follow its structure, headings, tables and depth):\n"""\n${excerpt(sec.text, 9000)}\n"""`
    : `WHAT THIS SECTION MUST COVER:\n${sec.brief}`;

  // House wording is reproduced, not rewritten. These blocks appear near-verbatim
  // across the firm's completed SOAs — they are the compliance language the
  // practice has settled on, and paraphrasing them loses that.
  const wording = sec.wording?.length ? houseWordingFor(sec.wording) : [];
  const houseBlock = wording.length
    ? `\n\nHOUSE WORDING for this section — reproduce these blocks essentially verbatim, `
      + `adapting only names and pronouns. Do not paraphrase them, and do not omit one `
      + `because it reads as boilerplate; this is the firm's settled compliance language. `
      + `Order them naturally within the section:\n`
      + wording.map((w, i) => `  (${i + 1}) ${w}`).join('\n')
    : '';

  // Conditional house wording: verbatim when used, but only where its stated
  // condition holds. Never "do not omit" — a replacement warning on brand-new
  // cover, or "declined" INA wording when an INA was done, is wrong advice.
  const conditional = (sec.conditionalWording || [])
    .map((group) => {
      const lines = group.blocks.flatMap((b) =>
        resolveWordingRef(b.ref).map((t) => ({ t, note: b.note })));
      return lines.length ? { when: group.when, lines } : null;
    })
    .filter(Boolean);
  const conditionalBlock = conditional.length
    ? conditional.map((g, gi) =>
      `\n\nCONDITIONAL HOUSE WORDING, group ${gi + 1} — CONDITION: ${g.when}\n`
      + `Where the condition holds, reproduce the applicable blocks essentially verbatim, adapting only `
      + `names and pronouns. Where it does not hold, leave them out entirely:\n`
      + g.lines.map((l, i) => `  (${i + 1}) [${l.note}] ${l.t}`).join('\n')).join('')
    : '';

  // Front matter must not open its own 1..N sequence: the numbered sections
  // follow it, and two competing outlines in one document reads as a fault.
  const frontMatterRule = sec.isFrontMatter
    ? '\n\nThis is the document FRONT MATTER (cover page, addressee, purpose, contents). '
      + 'Do NOT introduce your own numbered sections — the numbered sections come later in '
      + 'the document and your numbering would collide with theirs. Use unnumbered headings only.'
    : '';

  // Every section of one SOA sends the same system prompt and the same client
  // file — only the section ask differs. Caching is a prefix match, so the
  // stable content must come FIRST and carry the breakpoint; the per-section
  // guidance goes last. Across a 14-section SOA that turns 14 full-price reads
  // of the client file into one write and 13 cache reads.
  const stable =
    `CLIENT / HOUSEHOLD FILE:\n${contextText}\n\n`
    + `Date of advice (use for any preparation date): ${today}.`
    + (instructions ? `\n\nADVISER NOTES — these reflect the advice actually given and take precedence over inference: ${instructions}` : '');

  const volatile = `${guidance}${houseBlock}${conditionalBlock}\n\nNow write the section "${sec.title}" for this client.${frontMatterRule}`;

  const { text, ai } = await completeOrStub(
    {
      messages: [
        { role: 'system', content: SECTION_SYSTEM_PROMPT(templateTitle), cache: true },
        {
          role: 'user',
          content: [
            { type: 'text', text: stable, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: volatile },
          ],
        },
      ],
      // Thinking tokens count toward max_tokens, so a section needs real
      // headroom — at 4000 an SOA section with tables gets truncated.
      maxTokens: 12000,
      effort: 'high',
    },
    // Only reached when the API call for this section failed (aiEnabled() is
    // checked before any section is written).
    () => `## ${sec.title}\n\n${PLACEHOLDER} This section could not be generated (the AI call failed). Redraft the SOA or write this section by hand.`
  );
  return { text: stripCodeFence(text), ai };
}

/**
 * Generate a risk-only Statement of Advice, section by section.
 *
 * @param {object} ctx           client context from gatherClientContext()
 * @param {string} instructions  adviser notes describing the advice actually given
 * @param {{onProgress?: (p:{done:number,total:number,title:string}) => void}} [opts]
 *        onProgress fires as each section lands, so the caller can stream
 *        progress to the UI — a 14-section SOA takes minutes.
 * @returns {Promise<{text:string, body:string, title:string, date:string, ai:boolean,
 *          sections:number, failedSections:string[], usedTemplate:string|null}>}
 *          `text` is the full Markdown (title block + body); `body` is the same
 *          without the title block, for renderers that print their own title.
 *          `failedSections` lists sections whose AI call failed and fell back
 *          to a placeholder stub.
 */
export async function generateRiskSoa(ctx, instructions = '', { onProgress } = {}) {
  const tpl = await loadRiskTemplate();
  const templateSections = tpl ? splitTemplateSections(tpl.content) : [];
  const usingTemplate = templateSections.length >= 3;
  const sections = usingTemplate ? templateSections : LEGACY_SECTIONS;
  const templateTitle = usingTemplate ? tpl.title : null;

  const date = formatAuDate();
  const c = ctx.client;
  const title = `Statement of Advice — ${c.first_name} ${c.last_name}`;

  if (!aiEnabled()) {
    const body = buildStubBody();
    return {
      text: `# ${title}\n\n${body}`, body, title, date,
      ai: false, sections: 0, failedSections: [], usedTemplate: null,
    };
  }

  const contextText = contextToText(ctx);

  const parts = await mapLimit(
    sections, 5,
    (sec) => writeSection(sec, contextText, instructions, date, templateTitle),
    onProgress
  );

  const failedSections = sections.filter((_, i) => !parts[i]?.ai).map((sec) => sec.title);
  const body = parts.map((p) => p?.text).filter(Boolean).join('\n\n');
  const header = `# ${title}\n\n**Risk insurance advice** · Prepared ${date} · ${env.firm.name}\n\n---\n`;

  return {
    text: header + body,
    body,
    title,
    date,
    // True when at least one section was AI-written; check failedSections for
    // sections that fell back to the placeholder stub.
    ai: failedSections.length < sections.length,
    sections: sections.length,
    failedSections,
    usedTemplate: templateTitle,
  };
}

function buildStubBody() {
  return `> _Generated in offline stub mode (no Anthropic key configured). Set ANTHROPIC_API_KEY for full AI generation._

${LEGACY_SECTIONS.map((s) => `## ${s.title}\n\n${PLACEHOLDER} ${s.brief}`).join('\n\n')}
`;
}

export default { generateRiskSoa, loadRiskTemplate, LEGACY_SECTIONS, RISK_GUARDRAILS };
