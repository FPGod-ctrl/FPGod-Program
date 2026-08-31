import { query } from '../config/db.js';
import { aiEnabled, completeOrStub } from './ai.js';
import { contextToText, stripCodeFence } from './planGenerator.js';

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
 * Until then we fall back to DEFAULT_SECTIONS below, which is the standard
 * Australian risk-advice SOA skeleton.
 */

// ---------------------------------------------------------------------------
// Compliance + calculation guardrails specific to risk advice. These are
// injected into every section prompt and override the template where the
// template does something different. THRESHOLDS ARE DATE-SENSITIVE.
// ---------------------------------------------------------------------------
export const RISK_GUARDRAILS =
  'RISK ADVICE INTEGRITY — these rules are MANDATORY and override the template if it does something different:\n'
  + '1. NEVER state a premium, sum insured, occupation rating, loading or underwriting outcome that was not supplied in the client data or the adviser notes. Write [ADVISOR TO CONFIRM] instead. Premiums are indicative until the insurer confirms them in writing.\n'
  + '2. Show the working for every recommended sum insured. A needs analysis must list its components (debts to clear, income replacement multiple or term, education and care costs, final expenses, less existing cover and available liquid assets) and those components MUST sum to the stated recommendation. Re-check the arithmetic before writing the figure.\n'
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
  + '10. Never fabricate the client\'s personal details — name, date of birth, address, occupation, income, health or smoker status, existing policy numbers. If not supplied, write [ADVISOR TO CONFIRM].';

// ---------------------------------------------------------------------------
// Default section skeleton — used until the firm's own template is imported.
// `brief` tells the model what the section must contain.
// ---------------------------------------------------------------------------
export const DEFAULT_SECTIONS = [
  {
    title: '1. Scope and purpose of this advice',
    brief: 'State that this is personal advice limited to risk insurance (life, TPD, trauma and income protection). Say plainly what IS in scope and what is NOT — no investment, superannuation strategy, retirement, estate or tax advice beyond what bears directly on cover ownership and funding. Note anything the client asked to be excluded.',
  },
  {
    title: '2. About you',
    brief: 'The client and partner: names, ages, occupations and duties, employment basis, income, smoker status, dependants and their ages, and any health matters disclosed. Household position only as it bears on insurance need — debts, liquid assets, and any employer or super-held cover already in place.',
  },
  {
    title: '3. Your goals and what you asked me to do',
    brief: 'The protection objectives in the client\'s own terms — for example clear the mortgage on death, replace income if unable to work, fund a health event without drawing on savings, protect the children\'s education. Record the priority order and any budget constraint the client stated.',
  },
  {
    title: '4. Your existing insurance',
    brief: 'Every policy currently held: owner, life insured, insurer, policy number, cover type, sum insured, premium and structure, waiting and benefit periods, whether held inside or outside super, and any exclusions or loadings. Identify the gaps and overlaps against the needs analysis that follows.',
  },
  {
    title: '5. How much cover you need',
    brief: 'The needs analysis for each cover type, with the working shown as a table: debts to clear, income replacement (state the multiple or term and the assumption behind it), education and childcare costs, final expenses and medical buffer, less existing cover and available liquid assets. The components must sum to the recommended figure. State every assumption.',
  },
  {
    title: '6. My recommendations',
    brief: 'Each recommended policy in a table: life insured, cover type, sum insured, insurer and product, ownership (inside or outside super, and in whose name), premium structure (stepped or level), waiting and benefit period for income protection, and indicative premium. Total the premium cost.',
  },
  {
    title: '7. Why I am recommending this',
    brief: 'The rationale for each recommendation individually — why this cover type, why this amount, why this ownership structure, why this insurer and product over the alternatives considered. Link each back to the goals in section 3 and the needs analysis in section 5. This is the section that must stand up to a Best Interests Duty review.',
  },
  {
    title: '8. Ownership, structure and beneficiaries',
    brief: 'Why each policy is held where it is held, and the tax consequence of that choice. Beneficiary nominations: who should be nominated, binding versus non-binding, lapsing versus non-lapsing, and the dependant status of each nominee for tax purposes. Flag any cross-ownership or superannuation trustee steps required.',
  },
  {
    title: '9. Replacing your existing cover',
    brief: 'Only where cover is being replaced or cancelled. Compare old against new across definitions, waiting and benefit periods, exclusions, loadings, premium type and guaranteed renewability, and state plainly what is lost. Include the explicit warning not to cancel any existing policy until the replacement is confirmed in force. If nothing is being replaced, say so in one line.',
  },
  {
    title: '10. What this will cost you',
    brief: 'Total premiums, how they are funded (cashflow, superannuation balance, or rollover), stepped versus level and the long-run cost difference, and an affordability assessment against the client\'s stated budget and surplus. Address what happens if premiums later become unaffordable.',
  },
  {
    title: '11. Risks and things you should consider',
    brief: 'The risks of acting on this advice and of not acting: underwriting may produce loadings, exclusions or decline; cover is not in force until accepted; premiums rise with age under stepped structures; policy definitions limit when a claim is payable; under-insurance risk if the recommendation is only partly implemented; and the consequences of leaving the identified gaps unfilled.',
  },
  {
    title: '12. Fees, commissions and how I am paid',
    brief: 'Adviser service fee if any, and insurance commission — upfront and ongoing — in dollars where known and as a percentage, per policy. State any other benefit received. Where a figure is not yet known, mark it [ADVISOR TO CONFIRM].',
  },
  {
    title: '13. Other important information',
    brief: 'The duty to take reasonable care not to make a misrepresentation and the consequences of breaching it; the underwriting process and what the client must do; PDS and Target Market Determination references for each recommended product; the cooling-off period; privacy and how information is handled; and the complaints process including AFCA.',
  },
  {
    title: '14. Next steps',
    brief: 'A numbered action list stating who does what and by when — application forms to complete, medical or financial underwriting requirements, authorities to sign, beneficiary nominations to lodge, and the date cover is expected to commence. Finish with the authority to proceed.',
  },
];

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

/** Run async work with a concurrency cap, so a 14-section SOA stays affordable. */
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

const excerpt = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '');

async function writeSection(sec, contextText, instructions, today, templateTitle) {
  const guidance = sec.text
    ? `TEMPLATE SECTION (follow its structure, headings, tables and depth):\n"""\n${excerpt(sec.text, 9000)}\n"""`
    : `WHAT THIS SECTION MUST COVER:\n${sec.brief}`;

  const userContent =
    `${guidance}\n\n`
    + `CLIENT / HOUSEHOLD FILE:\n${contextText}\n\n`
    + `Date of advice (use for any preparation date): ${today}.`
    + (instructions ? `\n\nADVISER NOTES — these reflect the advice actually given and take precedence over inference: ${instructions}` : '')
    + `\n\nNow write the section "${sec.title}" for this client.`;

  const { text } = await completeOrStub(
    {
      messages: [
        { role: 'system', content: SECTION_SYSTEM_PROMPT(templateTitle) },
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
 * Generate a risk-only Statement of Advice, section by section.
 *
 * @param {object} ctx           client context from gatherClientContext()
 * @param {string} instructions  adviser notes describing the advice actually given
 * @returns {Promise<{text:string, ai:boolean, sections:number, usedTemplate:string|null}>}
 */
export async function generateRiskSoa(ctx, instructions = '') {
  const tpl = await loadRiskTemplate();
  const templateSections = tpl ? splitTemplateSections(tpl.content) : [];
  const usingTemplate = templateSections.length >= 3;
  const sections = usingTemplate ? templateSections : DEFAULT_SECTIONS;
  const templateTitle = usingTemplate ? tpl.title : null;

  if (!aiEnabled()) {
    return { text: buildStubSoa(ctx), ai: false, sections: 0, usedTemplate: null };
  }

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const contextText = contextToText(ctx);

  const parts = await mapLimit(sections, 5, (sec) =>
    writeSection(sec, contextText, instructions, today, templateTitle));

  const c = ctx.client;
  const header = `# Statement of Advice — ${c.first_name} ${c.last_name}\n\n`
    + `**Risk insurance advice** · Prepared ${today} · Legacy Risk Advice\n\n---\n`;

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

${DEFAULT_SECTIONS.map((s) => `## ${s.title}\n\n[ADVISOR TO CONFIRM] ${s.brief}`).join('\n\n')}
`;
}

export default { generateRiskSoa, loadRiskTemplate, DEFAULT_SECTIONS, RISK_GUARDRAILS };
