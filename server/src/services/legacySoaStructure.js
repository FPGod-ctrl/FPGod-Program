import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * The Legacy Risk Advice house SOA structure.
 *
 * Derived from 32 completed SOAs, not invented. Every section below appeared in
 * all 32 documents except where noted — the contents pages were identical across
 * the set, so this is the firm's actual standard rather than a generic skeleton.
 *
 * Two house positions that shape the whole document:
 *
 *  1. THE NEEDS ANALYSIS IS DONE, BUT NOT PRINTED. Every client gets a full
 *     needs analysis based on their situation; it happens in the background and
 *     the SOA presents the REASONS for the recommended levels of cover, not the
 *     arithmetic that produced them.
 *
 *     This is a deliberate departure from the 32 source documents. All 32 carry
 *     standard wording recording that the client DECLINED a full needs analysis
 *     because their requirements were specific. That is not the standard this
 *     practice is adopting, so that wording is not reproduced — see
 *     `needs-analysis-position` in the house wording file, which is retained for
 *     reference but deliberately not wired into any section.
 *
 *     The practical effect: reason every cover level through against the
 *     client's debts, income, dependants, existing cover and stated objectives,
 *     then write the justification. Do not print a component table that sums to
 *     the sum insured, and do not claim a needs analysis was declined.
 *
 *  2. RECOMMENDATIONS ARE PER STRATEGY, NOT PER POLICY. A "Strategy overview"
 *     table lists numbered strategies; each is then written up with its own
 *     rationale, a "Why you are likely better off" block and a "Risks and
 *     consequences" block, before a single portfolio table covering everything.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

/** House wording reproduced verbatim rather than rewritten. */
export const HOUSE_WORDING = JSON.parse(
  readFileSync(resolve(__dirname, '../data/legacy-house-wording.json'), 'utf8')
);

/** Blocks for a section, longest-serving first, as prompt-ready text. */
export function houseWordingFor(keys) {
  const out = [];
  for (const k of keys) {
    for (const b of HOUSE_WORDING.sections[k] || []) out.push(b.text);
  }
  return out;
}

export const LEGACY_SECTIONS = [
  {
    title: 'About this document',
    wording: ['about', 'reliance'],
    brief:
      'Standard opening. What the SOA is, that it is based on the client\'s relevant personal circumstances and the Fact Find, that they should check the information and tell us if anything is wrong, and an invitation to ask questions. This section is almost entirely house wording — reproduce it, adapting only the client\'s name.',
  },
  {
    title: 'Executive summary',
    wording: [],
    brief:
      'Two sub-headings, both client-specific and written fresh every time.\n'
      + '"Why are you seeking advice" — the client\'s situation in their own terms and what prompted them to come in now. Two to five short paragraphs, addressed to them by first name. This is the most personal writing in the document.\n'
      + '"Summary of our advice to you" — one line stating the advice has been prepared from recent discussions and the Fact Find, then "At this time, you have asked me to provide advice on:" followed by a short list of the advice areas.',
  },
  {
    title: 'Scope of our advice',
    wording: ['scope'],
    brief:
      'What is in scope and what is not. Sub-heading "Included" listing the agreed areas, then the scope of advice — typically "Analysis of your personal risk insurance needs:" followed by the cover types being advised on (Life, TPD, Trauma, Income Protection). Then the excluded areas under the standard wording about limiting advice. Include the standard note that any tax advice is incidental.',
  },
  {
    title: 'Your objectives',
    wording: ['objectives'],
    brief:
      'A table of the client\'s objectives with columns: Description | Priority and Target Date | Status. Each row is an objective in the client\'s terms, with priority (High/Medium/Low) and horizon (Short/Medium/Long Term). Introduced by the standard wording about taking their needs and objectives into consideration.',
  },
  {
    title: 'Where you are now',
    wording: ['current-position'],
    brief:
      'The client\'s current position as tables, not prose: personal details for each person (age, occupation, employment basis, income, smoker status, dependants), then income and expenditure, assets and liabilities, and existing insurance cover in force — insurer, policy, owner, life insured, cover type, sum insured, premium and premium structure. Where a figure was not supplied write [ADVISOR TO CONFIRM] rather than estimating.',
  },
  {
    title: 'Insurance recommendations',
    // 'needs-analysis-position' is deliberately excluded — see the header note.
    wording: ['recommendations', 'replacement', 'underwriting'],
    brief:
      'The core of the document.\n'
      + 'Open with the standard paragraph about this section detailing the recommendations for their insurance portfolio.\n'
      + '"Strategy overview" — a numbered Step | Strategy table naming each strategy (for example "Life Insurance with Superlinked TPD and Income Protection insurance and linked Trauma Insurance").\n'
      + 'Then write up EACH strategy in turn with: a review of existing cover where relevant; what is recommended and why, addressed to the client by name; a "Why you are likely better off with our recommendation" block covering the cover amount, waiting and benefit periods, premium structure and ownership, each with the reason; and a "Risks and consequences" block.\n'
      + 'Close with the portfolio table: Description | Owner | Life Insured | Type | Cover | Inside Super | Outside Super | Premium | Features | Action — with an Action of Retain, Replace, Cancel or New for every line.\n'
      + 'NEEDS ANALYSIS: a full needs analysis has been done for this client in the background. Work through it — their debts, income, dependants, existing cover and stated objectives — and use it to justify each recommended level of cover in the "Why you are likely better off" block. Present the REASONING, not the arithmetic: explain why this sum insured suits this client, without printing a component table that sums to it. Never state or imply that a needs analysis was declined or not undertaken.',
  },
  {
    title: 'Alternatives',
    wording: [],
    brief:
      'What else was considered and why it was dismissed. Standard opening about having assessed various alternatives, then "Alternative insurance products" naming the insurers evaluated and the reason each was not recommended, and where relevant why increasing or adjusting cover under an existing policy was unsuitable. Appears in about a quarter of documents — include it where alternatives were genuinely considered.',
  },
  {
    title: 'Important information',
    wording: ['important-info', 'duty-of-care', 'cooling-off', 'underwriting', 'reliance'],
    brief:
      'Almost entirely house wording — reproduce it. The PDS list for each recommended product; the duty to take reasonable care not to make a misrepresentation and its key elements; what happens if circumstances change before the policy issues; underwriting requirements and that cover does not commence until the insurer accepts; interim cover; the cooling-off period; the importance of regular review; and the standard reliance and currency statements.',
  },
  {
    title: 'Fees and disclosures',
    wording: ['fees'],
    brief:
      'How the adviser is paid. Standard wording that the licensee and its representatives may receive payments, benefits and commission; the commission table showing initial and ongoing commission per policy; the standard explanation of how insurance commission is calculated as a percentage of the annualised policy cost; and the clawback wording — 100% of commission in the first year and 60% in the second, invoiced to the client if the policy is replaced, cancelled or reduced within two years, with the hardship waiver. Where a commission figure is not supplied, write [ADVISOR TO CONFIRM].',
  },
  {
    title: 'Actions required',
    wording: ['actions'],
    brief:
      'A Steps to be actioned | Actioned by table: read the SOA and PDS (Clients), consider whether the advice is appropriate (Clients), sign the authority to proceed and application forms electronically (Clients), submit and follow up underwriting (Adviser), and confirm once cover is accepted. Introduced by the standard wording about undertaking the following steps.',
  },
  {
    title: 'Authority to proceed',
    wording: [],
    brief:
      'The client\'s declaration and signature block: that they have received and read the SOA and the relevant PDSs, that the information about them is correct, and that they authorise the adviser to proceed with the advice set out. Signature and date lines for each client, and for the adviser.',
  },
  {
    title: 'Appendix: Insurance quotes',
    wording: [],
    brief:
      'A placeholder heading for the insurer quotes attached to the document. State that the quotes for each recommended policy are attached, and list them. Do not fabricate quote figures — write [ADVISOR TO CONFIRM] where a premium has not been supplied.',
  },
];

/** Optional section, present in about a third of documents. */
export const RISK_PROFILE_SECTION = {
  title: 'Risk profile',
  wording: [],
  brief:
    'Only where a risk profile was actually completed. The client\'s assessed profile and what it means for the advice. Omit entirely if no profile is on file — do not invent one.',
};

export default { LEGACY_SECTIONS, HOUSE_WORDING, houseWordingFor, RISK_PROFILE_SECTION };
