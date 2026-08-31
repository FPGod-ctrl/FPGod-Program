import { query } from '../config/db.js';
import { aiEnabled, completeOrStub } from './ai.js';
import { contextToText, stripCodeFence } from './planGenerator.js';
import { env } from '../config/env.js';
import { LEGACY_SECTIONS, houseWordingFor } from './legacySoaStructure.js';

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
  + '1. NEVER state a premium, sum insured, occupation rating, loading or underwriting outcome that was not supplied in the client data or the adviser notes. Write [ADVISOR TO CONFIRM] instead. Premiums are indicative until the insurer confirms them in writing.\n'
  + '2. NEEDS ANALYSIS: a full needs analysis is completed for every client in the background, based on their situation. The SOA presents the REASONS for the recommended levels of cover, not the arithmetic. Reason each sum insured through against the client\'s debts, income, dependants, existing cover and stated objectives, then justify it in prose — do not print a component table that sums to the figure. NEVER state or imply that a needs analysis was declined, not undertaken, or waived. Any figure you do state must be arithmetically correct and consistent with the client data.\n'
  + '3. Ownership and structure must be stated for every recommended policy, with the tax consequence:\n'
  + '   - Life inside super: premiums are generally deductible to the fund, but a lump sum paid to a NON-tax-dependant is taxed on the taxable component (15% plus Medicare where applicable). Name the likely beneficiary and their dependant status.\n'
  + '   - TPD inside super: must satisfy a condition of release, so "any occupation" definition only. "Own occupation" TPD cannot be held inside super for policies issued from 1 July 2014.\n'
  + '   - Trauma / critical illness: CANNOT be held inside superannuation (it does not meet a SIS condition of release). Always recommend trauma cover outside super.\n'
  + '   - Income protection inside super: restricted to indemnity-style benefits, narrower definitions, and most ancillary benefits are unavailable. Outside super, premiums are generally tax-deductible to the individual.\n'
  + '4. REPLACEMENT OF EXISTING COVER: where a recommendation replaces or cancels existing cover you MUST include an explicit warning that the client must NOT cancel the existing policy until the new cover is confirmed in force and any exclusions or loadings are known; and you MUST compare old against new across definitions, waiting and benefit periods, exclusions, loadings, premium structure and any loss of loyalty or guaranteed-renewability benefits.\n'
  + '5. Refer to the duty to take reasonable care not to make a misrepresentation (Insurance Contracts Act 1984, as amended from 5 October 2021 for consumer insurance contracts) — NOT the superseded "duty of disclosure" wording.\n'
  + '6. State whether each premium is STEPPED or LEVEL and explain the long-run cost difference. Where affordability is a stated concern, address it explicitly rather than assuming it away.\n'
  + '7. Cover is not in force until the insurer accepts the application and confirms it. Underwriting may result in loadings, exclusions or decline — state this; never present acceptance as certain.\n'
  + '8. Disclose remuneration: adviser service fee and/or insurance commission (upfront and ongoing), in dollars where known, otherwise [ADVISOR TO CONFIRM]. Mark clearly where a figure is illustrative.\n'
  + '9. Use Australian terminology and AUD throughout. NEVER use US concepts (401k, IRA, Roth, HSA) or US insurance terms.\n'
  + '10. Never fabricate the client\'s personal details — name, date of birth, address, occupation, income, health or smoker status, existing policy numbers. If not supplied, write [ADVISOR TO CONFIRM].\n'
  + `11. FIRM IDENTITY — use these details and no others:\n`
  + `    Adviser: ${env.adviser.name}${env.adviser.ar ? `, Authorised Representative No. ${env.adviser.ar}` : ', Authorised Representative No. [ADVISOR TO CONFIRM]'}\n`
  + `    Firm: ${env.firm.legalName} ${env.firm.ar}, ABN ${env.firm.abn}\n`
  + `    ${env.firm.address}\n`
  + `    Authorised Representative of ${env.firm.licensee}, AFSL ${env.firm.licenseeAfsl}, ABN ${env.firm.licenseeAbn}\n`
  + `    ${env.firm.legalName} is a corporate Authorised Representative — the AFSL belongs to the licensee, never to the firm. Never describe the firm as holding an AFSL.\n`
  + `    Example documents in this system were written by OTHER advisers at this firm and by a PREVIOUS practice. Use them for structure, tone and house wording ONLY. Never reproduce another adviser's name, AR number or contact details, and never another firm's licensee or AFSL — issuing advice under the wrong licensee is a compliance breach. Where a detail is not given above, write [ADVISOR TO CONFIRM].\n`
  + '12. Never carry a client name, figure, policy or personal detail across from a reference document or template example into this client\'s advice.';


const SECTION_SYSTEM_PROMPT = (templateTitle) =>
  'You are a senior Australian risk insurance adviser writing ONE section of a Statement of Advice for a '
  + 'risk-only advice practice (life, TPD, trauma and income protection). '
  + (templateTitle
    ? `You are following the firm's own SOA template, "${templateTitle}". Mirror that section's structure, sub-headings, tables, tone and depth exactly, but populate everything with THIS client's real data. `
    : 'Write in plain English addressed directly to the client as "you" — professional but warm, with the reasoning spelled out rather than asserted. Use Markdown tables wherever figures are compared. ')
  + 'Write ONLY the requested section, in Markdown, starting with the section heading. '
  + 'Do NOT write investment, retirement-projection or broad superannuation strategy advice — this practice advises on risk insurance only. Superannuation appears only where it is the ownership vehicle for cover or the means of funding a premium. '
  + 'Where genuine adviser judgement or a figure you cannot derive is required, insert a clearly-marked [ADVISOR TO CONFIRM] placeholder rather than guessing. '
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

  const volatile = `${guidance}${houseBlock}\n\nNow write the section "${sec.title}" for this client.${frontMatterRule}`;

  const { text } = await completeOrStub(
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
    () => `## ${sec.title}\n\n_[Offline stub — set ANTHROPIC_API_KEY for AI generation.]_`
  );
  return stripCodeFence(text);
}

/**
 * Generate a risk-only Statement of Advice, section by section.
 *
 * @param {object} ctx           client context from gatherClientContext()
 * @param {string} instructions  adviser notes describing the advice actually given
 * @param {{onProgress?: (p:{done:number,total:number,title:string}) => void}} [opts]
 *        onProgress fires as each section lands, so the caller can stream
 *        progress to the UI — a 14-section SOA takes minutes.
 * @returns {Promise<{text:string, ai:boolean, sections:number, usedTemplate:string|null}>}
 */
export async function generateRiskSoa(ctx, instructions = '', { onProgress } = {}) {
  const tpl = await loadRiskTemplate();
  const templateSections = tpl ? splitTemplateSections(tpl.content) : [];
  const usingTemplate = templateSections.length >= 3;
  const sections = usingTemplate ? templateSections : LEGACY_SECTIONS;
  const templateTitle = usingTemplate ? tpl.title : null;

  if (!aiEnabled()) {
    return { text: buildStubSoa(ctx), ai: false, sections: 0, usedTemplate: null };
  }

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const contextText = contextToText(ctx);

  const parts = await mapLimit(
    sections, 5,
    (sec) => writeSection(sec, contextText, instructions, today, templateTitle),
    onProgress
  );

  const c = ctx.client;
  const header = `# Statement of Advice — ${c.first_name} ${c.last_name}\n\n`
    + `**Risk insurance advice** · Prepared ${today} · ${env.firm.name}\n\n---\n`;

  return {
    text: header + parts.filter(Boolean).join('\n\n'),
    ai: true,
    sections: sections.length,
    usedTemplate: templateTitle,
  };
}

function buildStubSoa(ctx) {
  const c = ctx.client;
  return `# Statement of Advice — ${c.first_name} ${c.last_name}

> _Generated in offline stub mode (no Anthropic key configured). Set ANTHROPIC_API_KEY for full AI generation._

${LEGACY_SECTIONS.map((s) => `## ${s.title}\n\n[ADVISOR TO CONFIRM] ${s.brief}`).join('\n\n')}
`;
}

export default { generateRiskSoa, loadRiskTemplate, LEGACY_SECTIONS, RISK_GUARDRAILS };
