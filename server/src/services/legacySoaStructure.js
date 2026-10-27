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
 *  1. THE NEEDS ANALYSIS POSITION COMES FROM THE ADVISER. Every SOA the adviser
 *     is asked "was a full Insurance Needs Analysis (INA) done?" (build-soa
 *     default, Q-SOA-1). The answer arrives in the adviser notes:
 *       - NO  -> the house client-directed wording (objectives.2,
 *                needs-analysis-position.1, the client-directed note, the
 *                "You have directed the following:" list) and the Incomplete
 *                INA warning (needs-analysis-position.2). These are sent as a
 *                CONDITIONAL group, not as always-on wording.
 *       - YES -> the reasons for each sum insured in prose against debts,
 *                income, dependants, existing cover and objectives; no
 *                component table; no "declined" wording.
 *       - notes silent -> [ADVISER TO CONFIRM] asking whether an INA was done.
 *
 *  Conditional wording: blocks that only apply in some cases (replacement
 *  warnings, INA wording) live in `conditionalWording`, each group carrying
 *  the condition the model must test. They are never sent with "do not omit".
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

/**
 * Resolve one wording reference to its block texts. A reference is either a
 * whole key ("fees") or one block of a key, 1-based ("about.5", matching the
 * numbering used in the spec and the build-soa references). Unknown refs give [].
 */
export function resolveWordingRef(ref) {
  const m = /^(.+)\.(\d+)$/.exec(ref);
  if (m && HOUSE_WORDING.sections[m[1]]) {
    const b = HOUSE_WORDING.sections[m[1]][Number(m[2]) - 1];
    return b ? [b.text] : [];
  }
  return (HOUSE_WORDING.sections[ref] || []).map((b) => b.text);
}

/** Blocks for a section, longest-serving first, as prompt-ready text. */
export function houseWordingFor(refs) {
  return (refs || []).flatMap(resolveWordingRef);
}

/** The single placeholder spelling (Q-SH-3 default); build_soa_notes.py FLAG matches it. */
export const PLACEHOLDER = '[ADVISER TO CONFIRM]';

/**
 * Replacement / cancellation / reduction warnings (build-soa Q-SOA-4 default).
 * Only for a recommendation that replaces, cancels or reduces existing cover;
 * never for brand-new cover. The clawback lead-in (replacement.3) is NOT here:
 * it belongs with the clawback rates in Fees and disclosures.
 */
export const REPLACEMENT_WORDING = {
  when:
    'Include the blocks in this group ONLY where a recommendation replaces, cancels or reduces '
    + 'existing cover, and only in the strategy write-up it applies to (in its "Risks and consequences" '
    + 'block). OMIT EVERY BLOCK IN THIS GROUP for brand-new cover where nothing existing is replaced, '
    + 'cancelled or reduced. If the notes do not say whether existing cover is being replaced, do not '
    + 'include them and write [ADVISER TO CONFIRM] whether existing cover is replaced.',
  blocks: [
    { ref: 'replacement.1', note: 'Suicide exclusion: only where new Life cover replaces existing Life cover.' },
    { ref: 'replacement.2', note: 'Non-disclosure / three-year avoidance: only where cover is replaced by a new contract.' },
    { ref: 'replacement.4', note: 'Health check: only where cover is cancelled or reduced.' },
    { ref: 'replacement.5', note: 'Continuity: only where an existing policy is replaced.' },
  ],
};

/** The client-directed INA wording + Incomplete INA warning (Q-SOA-1 default, answer "no"). */
export const INA_NOT_DONE_WORDING = {
  when:
    'Include the blocks in this group ONLY where the adviser notes say NO full Insurance Needs Analysis '
    + 'was done (client-directed cover). Place them under an "Insurance needs analysis" sub-heading, in '
    + 'this order: (1), (2), then the note "<first name>, please note that the insurance cover amounts '
    + 'outlined in this document have been based on the amounts you have requested. These cover levels '
    + 'are considered client-directed and reflect your expressed preferences.", then "You have directed '
    + 'the following:" with one bullet per action (new, replaced, cancelled, retained or reduced cover, '
    + 'with sum insured, waiting and benefit period, and the total per cover type), then one line naming '
    + 'the covers not reviewed, then (3) the Incomplete INA warning. Do not print a zero-filled needs table. '
    + 'If the notes say an INA WAS done, or are silent, OMIT EVERY BLOCK IN THIS GROUP.',
  blocks: [
    { ref: 'objectives.2', note: 'Client-directed INA line 1.' },
    { ref: 'needs-analysis-position.1', note: 'Client-directed INA line 2.' },
    { ref: 'needs-analysis-position.2', note: 'Incomplete INA warning.' },
  ],
};

export const LEGACY_SECTIONS = [
  {
    title: 'About this document',
    // about.5 is the Alternatives lead-in; it opens that section instead.
    wording: ['about.1', 'about.2', 'about.3', 'about.4', 'reliance'],
    brief:
      'Standard opening. What the SOA is, that it is based on the client\'s relevant personal circumstances and the Fact Find, that they should check the information and tell us if anything is wrong, and an invitation to ask questions. This section is almost entirely house wording — reproduce it, adapting only the client\'s name.',
  },
  {
    title: 'Executive summary',
    wording: [],
    brief:
      'Two sub-headings, both client-specific and written fresh every time.\n'
      + '"Why are you seeking advice" — the client\'s situation in their own terms and what prompted them to come in now. Two to five short paragraphs, addressed to them by first name. This is the most personal writing in the document.\n'
      + 'DRAW THIS FROM THE MEETING NOTES AND CORRESPONDENCE, not from the financial data. The numbers say what the client has; only the meeting says why they came in, what worries them, what they said in their own words and what they have already been told. Use their phrasing and their reasons where the notes give them. If a concern, life event or constraint is recorded in the notes — a new baby, a job change, a health scare, a budget limit, a bad claims experience — it belongs here. Where the notes are thin, say less rather than inventing motivation.\n'
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
    // objectives.2 is client-directed INA line 1 (conditional, in recommendations);
    // objectives.3 is the recommendations opening paragraph.
    wording: ['objectives.1'],
    brief:
      'A table of the client\'s objectives with columns: Description | Priority and Target Date | Status. Each row is an objective in the client\'s terms, with priority (High/Medium/Low) and horizon (Short/Medium/Long Term). Introduced by the standard wording about taking their needs and objectives into consideration.',
  },
  {
    title: 'Where you are now',
    wording: ['current-position'],
    brief:
      'The client\'s current position as tables, not prose: personal details for each person (age, occupation, employment basis, income, smoker status, dependants), then income and expenditure, assets and liabilities, and existing insurance cover in force — insurer, policy, owner, life insured, cover type, sum insured, premium and premium structure. Where a figure was not supplied write [ADVISER TO CONFIRM] rather than estimating.',
  },
  {
    title: 'Insurance recommendations',
    // objectives.3 is this section's opening paragraph. Replacement warnings and
    // the INA wording are conditional groups, never always-on.
    wording: ['objectives.3', 'recommendations', 'underwriting'],
    conditionalWording: [INA_NOT_DONE_WORDING, REPLACEMENT_WORDING],
    brief:
      'The core of the document.\n'
      + 'Open with the standard paragraph (house wording) about this section detailing the recommendations for their insurance portfolio.\n'
      + 'Then an "Insurance needs analysis" sub-heading. Read the adviser notes for whether a full Insurance Needs Analysis (INA) was done:\n'
      + '  - Notes say NO INA was done (client-directed): use the conditional client-directed INA wording and the Incomplete INA warning supplied below, in the order given there.\n'
      + '  - Notes say an INA WAS done: give the REASONS for each recommended sum insured in prose against the client\'s debts, income, dependants, existing cover and stated objectives — do not print a component table that sums to the figure, and do not use the client-directed or "declined" wording.\n'
      + '  - Notes are silent: write "[ADVISER TO CONFIRM] Was a full Insurance Needs Analysis done for this client?" and do not assume either answer — no "declined" wording and no claim that one was done.\n'
      + '"Strategy overview" — a numbered Step | Strategy table naming each strategy (for example "Life Insurance with Superlinked TPD and Income Protection insurance and linked Trauma Insurance"). Headings only, one row per step.\n'
      + 'Then write up EACH strategy in turn with: a review of existing cover where relevant; what is recommended and why, addressed to the client by name; a "Why you are likely better off with our recommendation" block covering the cover amount, waiting and benefit periods, premium structure and ownership, each with the reason; and a "Risks and consequences" block.\n'
      + 'For each strategy decide from the notes whether it is NEW cover or REPLACES, CANCELS or REDUCES existing cover. The replacement warnings are for the latter only — never put them on brand-new cover.\n'
      + 'Close with the portfolio table: Description | Owner | Life Insured | Type | Cover | Inside Super | Outside Super | Premium | Features | Action — with an Action of Retain, Replace, Cancel or New for every line.',
  },
  {
    title: 'Alternatives',
    wording: ['about.5'],
    brief:
      'What else was considered and why it was dismissed. Open with the house-wording lead-in about having assessed various alternatives. Where existing cover is held, "Retain your existing cover" is an alternative strategy with the reason it was not recommended. Then "Alternative insurance products" naming only the insurers in the research or quotes on file and the reason each was not recommended, and where relevant why increasing or adjusting cover under an existing policy was unsuitable. Always include this section; where nothing is on file write [ADVISER TO CONFIRM] rather than naming insurers.',
  },
  {
    title: 'Important information',
    wording: ['important-info', 'duty-of-care', 'cooling-off', 'underwriting', 'reliance'],
    brief:
      'Almost entirely house wording — reproduce it. The PDS list for each recommended product; the duty to take reasonable care not to make a misrepresentation and its key elements; what happens if circumstances change before the policy issues; underwriting requirements and that cover does not commence until the insurer accepts; interim cover; the cooling-off period; the importance of regular review; and the standard reliance and currency statements.',
  },
  {
    title: 'Fees and disclosures',
    // replacement.3 is the clawback lead-in; general.7 the hardship waiver.
    wording: ['fees', 'replacement.3', 'general.7'],
    brief:
      'How the adviser is paid. Standard wording that the licensee and its representatives may receive payments, benefits and commission; the commission table showing initial and ongoing commission per policy; the standard explanation of how insurance commission is calculated as a percentage of the annualised policy cost; and the clawback: the house-wording clawback lead-in ("Therefore, if you replace, cancel or reduce … as set out below;") immediately followed by the clawback rate table — 100% of commission in the first year and 60% in the second, applying if the policy is replaced, cancelled or reduced within two years — and then the hardship waiver. Where a commission figure is not supplied, write [ADVISER TO CONFIRM].',
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
      'A placeholder heading for the insurer quotes attached to the document. State that the quotes for each recommended policy are attached, and list them. Do not fabricate quote figures — write [ADVISER TO CONFIRM] where a premium has not been supplied.',
  },
];

/** Optional section, present in about a third of documents. */
export const RISK_PROFILE_SECTION = {
  title: 'Risk profile',
  wording: [],
  brief:
    'Only where a risk profile was actually completed. The client\'s assessed profile and what it means for the advice. Omit entirely if no profile is on file — do not invent one.',
};

export default {
  LEGACY_SECTIONS, HOUSE_WORDING, houseWordingFor, resolveWordingRef, PLACEHOLDER,
  REPLACEMENT_WORDING, INA_NOT_DONE_WORDING, RISK_PROFILE_SECTION,
};
