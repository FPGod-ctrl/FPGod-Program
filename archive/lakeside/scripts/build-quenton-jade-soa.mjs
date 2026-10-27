// Quenton Gascoigne & Jade Casey — COMPREHENSIVE wealth/investment SOA (Williams + Davidson depth).
// Focus: deploying ~$2.2m surplus cash + SMSF / commercial property in super + projections.
// Self-designed compliant format (green Lakeside styling), docx library. Self-contained — no external imports.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../generated-plans/Quenton Gascoigne & Jade Casey - Statement of Advice.docx');

const BRAND = '4C9A2A';
const ACCENT = '2E5A17';
const HDR_FILL = 'CDE3BF';
const CALL_FILL = 'F2F8ED';
const GREY = '595959';
const FONT = 'Calibri';

const run = (text, o = {}) => new TextRun({ text, bold: o.bold, italics: o.italics, color: o.color, size: o.size ?? 20, font: FONT, break: o.break });
const P = (text, o = {}) => new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 140, line: 276 }, children: Array.isArray(text) ? text : [run(text, o)] });
const H1 = (text) => new Paragraph({ spacing: { before: 260, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND } }, children: [run(text, { bold: true, size: 26, color: ACCENT })] });
const H2 = (text) => new Paragraph({ spacing: { before: 160, after: 70 }, children: [run(text, { bold: true, size: 22, color: ACCENT })] });
const H3 = (text) => new Paragraph({ spacing: { before: 120, after: 50 }, children: [run(text, { bold: true, size: 20, color: GREY })] });
const bullet = (text) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 276 }, children: Array.isArray(text) ? text : [run(text)] });
const leg = (text) => new Paragraph({ spacing: { before: 40, after: 120 }, children: [run('Legislative basis: ', { italics: true, size: 17, color: GREY, bold: true }), run(text, { italics: true, size: 17, color: GREY })] });

function cell(text, o = {}) {
  const children = Array.isArray(text) ? text
    : [new Paragraph({ spacing: { after: 20, line: 264 }, alignment: o.align, children: [run(text, { bold: o.bold, color: o.color, size: 18 })] })];
  return new TableCell({ children, shading: o.fill ? { fill: o.fill } : undefined, width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined, margins: { top: 40, bottom: 40, left: 80, right: 80 } });
}
function bulletCell(items, width) {
  const paras = items.map((t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 30, line: 264 }, children: [run(t, { size: 18 })] }));
  return new TableCell({ children: paras, width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined, margins: { top: 40, bottom: 40, left: 140, right: 80 } });
}
function table(headers, rows, widths) {
  const b = { style: BorderStyle.SINGLE, size: 2, color: 'BFBFBF' };
  const borders = { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
  const headRow = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { bold: true, fill: HDR_FILL, color: ACCENT, width: widths && widths[i] })) });
  const dataRows = rows.map((r) => new TableRow({ children: r.map((c, i) => Array.isArray(c) ? bulletCell(c, widths && widths[i]) : cell(String(c), { width: widths && widths[i] })) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: [headRow, ...dataRows] });
}
function callout(text, o = {}) {
  const b = { style: BorderStyle.SINGLE, size: 4, color: BRAND };
  const kids = Array.isArray(text) ? text : [new Paragraph({ spacing: { after: 0, line: 276 }, children: [run(text, { size: 19, italics: o.italics })] })];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b },
    rows: [new TableRow({ children: [new TableCell({ shading: { fill: CALL_FILL }, margins: { top: 90, bottom: 90, left: 140, right: 140 }, children: kids })] })] });
}
const spacer = (h = 80) => new Paragraph({ spacing: { after: h }, children: [] });
const rec = (text) => new Paragraph({ spacing: { before: 60, after: 80, line: 276 }, children: [run('Recommendation. ', { bold: true, color: ACCENT }), run(text)] });

// ── Title page ──────────────────────────────────────────────────────────────
const title = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000, after: 60 }, children: [run('STATEMENT OF ADVICE', { bold: true, size: 52, color: BRAND })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 900 }, children: [run('Wealth, Investment & Superannuation', { size: 28, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Prepared for', { size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [run('Quenton Gascoigne & Jade Casey', { bold: true, size: 34 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Prepared by', { size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Tristan Biro (FP)', { bold: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Authorised Representative No. 001313019', { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Lakeside Financial Pty Ltd', { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Suite 201, 429 Bay Street, Brighton VIC 3186  ·  03 9596 5111', { size: 18, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [run('Authorised Representative of Pareto Group Pty Ltd  ·  AFSL 418700  ·  ABN 11 155 278 078', { size: 18, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [run('Date of advice: 3 July 2026', { bold: true, size: 22 })] }),
  callout([
    new Paragraph({ spacing: { after: 0, line: 276 }, children: [
      run('DRAFT — FOR ADVISER / LICENSEE COMPLIANCE REVIEW BEFORE ISSUE. ', { bold: true, size: 18, color: ACCENT }),
      run('Prepared as a drafting aid. Before it is provided to the clients it must be reviewed and approved under Pareto Group’s advice-compliance process — documenting that the best-interests duty and appropriateness obligations (Corporations Act s961B–961G) are met; verifying every [TO CONFIRM] figure; completing fee disclosure, ongoing fee consent and the Fee Disclosure Statement; providing the current FSG and relevant PDS/IM/TMD documents; and a record-of-advice file note. Do not issue until complete.', { size: 17, color: GREY }),
    ] }),
  ]),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

// ── Body ─────────────────────────────────────────────────────────────────────
const body = [
  H1('Executive summary'),
  P('You hold approximately $2,200,000 in a term deposit earning around 4%, taxed at Quenton’s top marginal rate. This paper recommends deploying that surplus cash across a diversified, tax-effective structure — including establishing a self-managed super fund (SMSF) to hold commercial property in the low-tax super environment — while deliberately retaining a large cash reserve so you keep the liquidity and flexibility you value. The strategy levers, ranked by impact, are:'),
  table(['#', 'Strategy lever', 'What it does', 'Indicative benefit', 'Priority'], [
    ['1', 'Establish an SMSF and acquire commercial property via an LRBA', 'Gear a ~$1.6m property in super; income taxed 15% (0% in pension) + growth', 'Large, long-term', 'High'],
    ['2', 'Move surplus cash into super (non-concessional + catch-up)', 'Shifts capital from a 47%-taxed environment to 15%', 'Thousands p.a. in tax', 'High'],
    ['3', 'Deploy cash into diversified investments (managed portfolio + private credit)', 'Lifts return on ~$800k from ~4% to a blended ~6.5–8%', '≈+$25,000 p.a. gross', 'High'],
    ['4', 'Tax-effective ownership (family trust / Jade)', 'Moves investment income from ~47% to ~18%', 'Thousands p.a. in tax', 'High'],
    ['5', 'Tax-effective investment bond ($150k)', '30% tax-paid structure for education & long-term goals', 'Lower tax vs ~47%', 'Medium'],
    ['6', 'Repay the $90,000 car loan', 'Removes debt costing more than the cash earns', '≈$6,300 p.a. saved', 'Immediate'],
    ['7', 'Low-income super incentives (Jade)', 'Spouse offset, co-contribution & LISTO', 'up to ≈$1,540', 'Medium'],
    ['8', 'Estate planning & intergenerational wealth', 'Protects & structures your estate and inheritances', 'Tax leakage avoided', 'High'],
    ['9', 'Housekeeping — tax returns & insurance claim', 'Unlocks the super strategy; assesses a potential trauma claim', 'Refunds + claim', 'Immediate'],
  ], [5, 30, 32, 20, 13]),
  P('Each lever is set out in full in Sections 7–23 — with the recommendation, the reasoning, supporting tables, and the legislative basis. Investment holding periods and sell discipline are in Section 11; the SMSF, commercial property and projections in Sections 15–18. All legislation cited is consolidated in Appendix D, and plain-English explanations of every concept are in Appendix H.'),

  H1('1. Purpose of this document'),
  P('This Statement of Advice (SOA) sets out the personal financial advice I am providing to you, Quenton Gascoigne and Jade Casey, and the reasons for it. It explains your goals and current situation; what I recommend and why each recommendation is appropriate for you; the benefits, risks, costs and consequences of acting; the alternatives I considered; and how to put the advice into effect.'),
  P('Please read it carefully. The advice is valid as at the date shown and is based on the information you have provided and the law and rates applying in the 2025–26 financial year. If your circumstances change, the advice may no longer be appropriate. This is personal advice; please also read the Financial Services Guide (FSG) I have provided, together with the Information Memorandum (IM), Product Disclosure Statement (PDS) and Target Market Determination (TMD) for each investment referred to.'),
  H2('How to read this document'),
  P('Sections 2–6 set out your situation, goals, the scope of my advice, and a summary of my recommendations. Sections 7–23 are the detailed advice — one section per strategy, each structured as Recommendation → Why it is appropriate for you → How to implement → Risks, with the legislative basis where relevant. Sections 24–25 set out the recommended managed portfolio in detail and the indicative outcome. Sections 26–32 cover risks, alternatives, costs and conflicts, disclosures, the implementation plan, information still needed, and your authority to proceed. The appendices contain the information relied upon, tax and contribution reference tables, the legislation cited, a glossary, your investment approach, the full portfolio look-through, and plain-English explanations.'),

  H1('2. About you — your circumstances'),
  H2('Personal'),
  table(['', 'Quenton Gascoigne', 'Jade Casey'], [
    ['Date of birth / age', '22/03/1977 (49)', '03/02/1983 (43)'],
    ['Residency', 'Australian tax resident', 'Australian tax resident'],
    ['Marital status', 'Married (together 10 years)', 'Married'],
    ['Occupation', 'Construction Manager — 2Construct', 'Teacher’s Aide — Balcombe Grammar'],
    ['Employment basis', 'Full time', 'Full time'],
    ['Smoker', 'No', 'No'],
    ['Private health', 'Yes — AHM', '—'],
    ['Address', '69 Dominion Road, Mt Martha VIC 3934 (renting — $1,600/week)', '(as above)'],
  ], [22, 40, 38]),
  H2('Income and tax'),
  table(['', 'Quenton', 'Jade'], [
    ['Annual income (incl. bonus)', '$225,000', '$40,000'],
    ['Marginal tax rate (incl. 2% Medicare)', '≈47% (top bracket)', '≈18%'],
    ['Employer super contributions', '≈$25,000 p.a.', '12% of salary'],
    ['Tax returns', 'Two or more years outstanding (Silverado logbook) — Section 23', 'To confirm'],
  ], [34, 33, 33]),
  H2('Quenton — current tax position (FY26, illustrative)'),
  table(['Item', 'Amount'], [
    ['Gross income (incl. bonus)', '$225,000'],
    ['Estimated deductions', '[TO CONFIRM — affected by the Silverado logbook issue]'],
    ['Taxable income', '≈$225,000'],
    ['Income tax + 2% Medicare levy', '≈$71,900'],
    ['Net (after-tax) income', '≈$153,100'],
    ['Marginal tax rate', '47% (top bracket)'],
  ], [55, 45]),
  H2('Jade — current tax position (FY26, illustrative)'),
  table(['Item', 'Amount'], [
    ['Gross income', '$40,000'],
    ['Taxable income', '≈$40,000'],
    ['Income tax + Medicare (after Low Income Tax Offset)', '≈$3,700'],
    ['Net (after-tax) income', '≈$36,300'],
    ['Marginal tax rate', '18% (incl. Medicare)'],
  ], [55, 45]),
  P('The ≈29 percentage-point gap between your marginal rates (47% vs 18%) is the single biggest tax lever available to you — it is why owning income-producing investments through the family trust or in Jade’s name is so valuable (Section 12), and why moving capital into superannuation (15%) and a 30%-taxed investment bond is so effective for Quenton (Sections 13, 16).'),
  H2('Family'),
  P('You have two children: Brooklyn Bould (13, DOB 26/11/2012) and Parker Gascoigne (8, DOB 25/09/2017). Both attend private school at a cost of approximately $10,000 per annum each. Both are minors, which is relevant to the trust-distribution point in Section 12.'),
  H2('Assets, liabilities & net wealth'),
  table(['Item', 'Value', 'Owner'], [
    ['Cash — Westpac term deposit (≈4% variable)', '$2,200,000', 'Quenton [TO CONFIRM — profile lists “Amanda”]'],
    ['Cryptocurrency (XRP)', '$250,000', 'Family trust'],
    ['Motor vehicles', '$150,000', 'Personal'],
    ['Superannuation — CBUS', '$400,000', 'Quenton'],
    ['Superannuation — Jade', '[TO CONFIRM]', 'Jade'],
    ['Total assets', '≈$3,000,000', ''],
    ['Car loan', '($90,000)', 'Personal'],
    ['Net wealth', '≈$2,910,000', ''],
  ], [54, 24, 22]),
  P('You have recently sold several property projects over 2–3 years and are now in a very strong liquidity position, with minimal leverage. Your only interest-bearing debt is the $90,000 car loan; I have treated your weekly rent ($1,600/week ≈ $83,200 p.a.) as a living expense, not a debt.', { italics: true, color: GREY }),
  H2('Estate planning'),
  P('You both hold Wills that include testamentary trusts (last reviewed with Lakeside Financial in 2018) and Powers of Attorney. Two urgent third-party matters were identified — your mother’s Will and Jade’s parents’ estate planning — addressed in Section 21.'),
  H2('Cash flow'),
  P('You have not provided a detailed breakdown of your monthly expenditure, so I have not prepared a month-by-month cash-flow model. Your combined gross income is approximately $265,000 p.a. and you have described a significant surplus. The focus of this advice is therefore the productive deployment of your accumulated surplus cash rather than day-to-day budgeting. [TO CONFIRM expenditure if detailed cash-flow modelling is required.]'),
  H2('Risk profile'),
  P('[TO CONFIRM — to be formally assessed and documented via a risk-profile questionnaire.] Indicatively, your circumstances point to a balanced profile with a growth tilt but a strong stated preference for liquidity and capital security. The recommendations are built around that balance and are confirmed subject to your completed questionnaire.'),

  H1('3. Your goals and objectives'),
  P('In priority order:'),
  bullet('Put your surplus cash to more productive use than a 4% term deposit — consistent with your income, risk tolerance and long-term wealth objectives — while retaining strong liquidity for future opportunities.'),
  bullet('Build long-term, tax-effective wealth through superannuation, including establishing an SMSF to hold commercial property in super.'),
  bullet('Diversify your wealth beyond cash and a single, concentrated cryptocurrency position.'),
  bullet('Invest tax-effectively, recognising the large gap between Quenton’s (~47%) and Jade’s (~18%) marginal tax rates and your existing family trust.'),
  bullet('Continue to avoid new personal (non-super) debt for now — you are comfortable renting and value flexibility.'),
  bullet('Provide for your children, including funding their private-school education.'),
  bullet('Ensure your family and any future inheritances are protected and structured tax-effectively.'),

  H1('4. Scope of this advice'),
  H2('Included'),
  P('Deployment of your surplus cash (a structured cash reserve, secured private credit, a diversified managed portfolio and a tax-effective investment bond); investment holding periods, review and sell discipline, including CGT sequencing; repayment of your car loan; establishing and funding a self-managed super fund; superannuation contribution strategies (catch-up and ongoing concessional, non-concessional bring-forward, and spouse/co-contribution/LISTO for Jade); acquiring commercial property within the SMSF and the related projections; investment ownership and tax-effective structuring (including your family trust); an education-funding strategy; management of your existing cryptocurrency holding; and coordination of your estate planning, insurance review and outstanding tax returns.'),
  H2('Excluded / referred (limitations)'),
  bullet('Legal drafting of Wills and Powers of Attorney — referred to our solicitor, Doug Patrick (Lakeside Lawyers).'),
  bullet('Tax-return preparation and tax advice — referred to our accounting partner, Aidan; your outstanding returns must be finalised before the super contribution strategies can be implemented (Section 23).'),
  bullet('SMSF administration, audit and the selection of a specific commercial property — the SMSF is established and administered with our specialist administrator/accountant; specific property selection and due diligence is a separate step (indicative parameters only here).'),
  bullet('Detailed personal insurance advice — placed on hold pending your histology report and a possible trauma claim (Section 22); a full insurance review will be separate advice.'),
  bullet('The decision to purchase a home / take on personal borrowing — noted in Section 27 (Alternatives) but not advised on here.'),
  bullet('Detailed advice on cryptocurrency as an asset class — I address only its role and risk within your overall wealth (Section 20).'),
  P('This is scaled advice, limited to the areas above. I have relied on the information in Appendix A; where information is incomplete I have stated assumptions and [TO CONFIRM] items — please tell me if any is wrong, as it may change the advice.', { italics: true, color: GREY }),

  H1('5. Summary of my advice'),
  table(['#', 'Section', 'Recommendation', 'Priority'], [
    ['1', '7', 'Establish a structured cash & emergency reserve of ≈$500,000 across more than one ADI.', 'High'],
    ['2', '8', 'Repay the $90,000 car loan from cash.', 'Immediate'],
    ['3', '9', 'Allocate an initial $200,000 to secured private credit via Capital SL Premium (~8.5–9%).', 'High'],
    ['4', '10', 'Invest ≈$600,000 into the CFS Lakeside MS Balanced portfolio (60/40), outside super.', 'High'],
    ['5', '11', 'Adopt clear investment holding periods, a review/sell discipline and CGT sequencing.', 'High'],
    ['6', '12', 'Structure new income-producing investments tax-effectively (family trust / Jade’s name).', 'High'],
    ['7', '13', 'Invest ≈$150,000 into a tax-effective investment bond (education).', 'Medium'],
    ['8', '14', 'Establish a dedicated education-funding pool for Brooklyn & Parker.', 'Medium'],
    ['9', '15', 'Establish a self-managed super fund (SMSF) and roll in your existing super.', 'High'],
    ['10', '16', 'Move ≈$660,000 of surplus cash into super (NCC bring-forward + catch-up concessional) and contribute ongoing.', 'High'],
    ['11', '17, 17A', 'Acquire a ~$1.6m commercial property within the SMSF via an LRBA (~65% borrowed); outright ~$1.1m is the lower-risk alternative.', 'High'],
    ['12', '18', 'Model the SMSF & superannuation projections (geared) to retirement.', 'Info'],
    ['13', '19', 'Capture Jade’s spouse contribution offset, government co-contribution and LISTO.', 'Medium'],
    ['14', '20', 'Retain XRP as a small, capped satellite; make no further purchases.', 'Medium'],
    ['15', '21', 'Coordinate estate planning — your Wills, your mother’s Will, and Jade’s parents’ estate.', 'High'],
    ['16', '22', 'Retain all existing insurance; obtain the histology report and assess the potential trauma claim.', 'High'],
    ['17', '23', 'Finalise the outstanding tax returns (precondition for the super strategies).', 'Immediate'],
  ], [4, 8, 71, 17]),
  H2('How the $2,200,000 is allocated'),
  table(['Use of funds', 'Amount', 'Where held'], [
    ['Repay car loan', '$90,000', 'Debt eliminated'],
    ['Cash & emergency reserve', '$500,000', 'Personal — multiple ADIs'],
    ['Private credit — Capital SL Premium', '$200,000', 'Trust / Jade (Section 12)'],
    ['CFS Lakeside MS Balanced portfolio', '$600,000', 'Trust / Jade (outside super)'],
    ['Investment bond', '$150,000', 'Quenton (tax-paid structure)'],
    ['Into SMSF — non-concessional (bring-forward)', '$600,000', 'Superannuation (SMSF)'],
    ['Into SMSF — catch-up concessional', '$60,000', 'Superannuation (SMSF)'],
    ['Total', '$2,200,000', ''],
  ], [46, 18, 36]),
  P('In addition, your existing super (Quenton’s CBUS ≈$400,000 and Jade’s balance) is rolled into the SMSF — together with the contributions above, this funds the commercial-property purchase in Section 17. Outside super you retain ≈$1,450,000 (of which cash and the managed portfolio, ≈$1.1m, are readily accessible), so you remain highly liquid despite the super commitment.', { italics: true, color: GREY }),

  H1('6. Your current financial position — analysis'),
  P('You are in a strong position — high household income, net worth ≈$2.9M, minimal debt, and significant surplus liquidity. The issues I have identified are:'),
  bullet('Cash drag. ≈$2,200,000 sits in a term deposit at ~4%, fully taxed at Quenton’s ~47% marginal rate — a low after-tax return relative to your earning capacity and objectives.'),
  bullet('Tax inefficiency. Investment income earned in Quenton’s name is taxed at ~47%, while Jade (~18%), your family trust, superannuation (15%) and an investment bond (30%) are all more tax-effective.'),
  bullet('Under-used superannuation. Quenton has unused concessional capacity and neither of you is using super — a low-tax structure — to build long-term wealth; and you cannot currently hold direct/commercial property in your existing funds.'),
  bullet('Concentration. Your only market investment is a single, highly volatile cryptocurrency (XRP, down ~50%); you hold no diversified growth or income assets outside cash.'),
  bullet('Inefficient debt. A $90,000 car loan is likely costing more in after-tax interest than the after-tax return on the cash backing it.'),
  bullet('Housekeeping risk. Outstanding tax returns are holding up the super strategy; your 2018 estate documents warrant review; and a potential insurance claim needs to be progressed.'),

  // ── STRATEGY 1 ──
  H1('7. Strategy 1 — Establish a structured cash & emergency reserve  [HIGH]'),
  rec('Retain approximately $500,000 as a structured cash reserve, split between an at-call high-interest account and one or more term deposits, spread across more than one authorised deposit-taking institution (ADI).'),
  H3('Why this is appropriate for you'),
  P('This reflects your preference to remain nimble and debt-free: it covers your rent and lifestyle, provides a strong emergency buffer, and keeps capital available for opportunities — so you are never a forced seller of your growth or private-credit investments. Cash held with an Australian ADI is capital-stable and, up to $250,000 per person per ADI, is protected by the Government’s Financial Claims Scheme (FCS); spreading term deposits across several ADIs maximises that protection. Because a substantial portion of your wealth is going into (preserved) super and a commercial property, ~$500,000 in cash — alongside your liquid managed portfolio — is an appropriate, deliberate liquidity buffer.'),
  H3('How to implement'),
  P('Retain ~$500,000 in cash after the other allocations; ladder term deposits across two or three ADIs to stay within the $250,000 FCS limit per institution per person and to smooth maturities; hold an at-call component for immediate access; review rates at each maturity.'),
  H3('Risks / consequences'),
  P('Cash produces a relatively low, fully taxable return, and inflation erodes its real value over long periods — which is why I do not recommend leaving more than your reserve in cash.'),
  leg('Financial Claims Scheme — Banking Act 1959 (Cth).'),

  // ── STRATEGY 2 ──
  H1('8. Strategy 2 — Repay the car loan  [IMMEDIATE]'),
  rec('Repay the $90,000 car loan in full from your cash reserve.'),
  H3('Why this is appropriate for you'),
  P('Car and personal loans typically carry interest rates well above term-deposit rates. Loan interest is paid with after-tax money, while the cash backing the loan earns ~4% before tax (≈2.1% after tax at Quenton’s marginal rate). Repaying the loan delivers a guaranteed, risk-free, tax-free return equal to the loan interest rate — almost certainly a better use of ~$90,000 than the term deposit — and removes your only interest-bearing debt.'),
  table(['Option', 'What happens', 'Effective outcome'], [
    ['Keep $90,000 in cash and keep the loan', 'Cash earns ~4% (≈2.1% after tax); loan costs ~7%', 'A net drag of ~5% p.a. on $90,000 (≈$4,500 lost each year)'],
    ['Repay the loan (recommended)', 'No further loan interest; ~$90,000 comes out of the cash reserve', 'A guaranteed, tax-free saving of ~$6,300 p.a. (at a 7% loan rate)'],
  ], [34, 34, 32]),
  P('Illustrative — assumes a ~7% loan rate; to be confirmed.', { italics: true, color: GREY }),
  H3('How to implement'),
  P('Confirm the exact payout figure and any early-repayment/break fees; if the fees are modest relative to the interest saved, repay in full. [TO CONFIRM the loan’s interest rate and any break costs.]'),
  H3('Risks / consequences'),
  P('Minimal. If the loan carried a very low promotional rate below your after-tax cash return, repayment would be less compelling — hence confirming the rate first.'),

  // ── STRATEGY 3 ──
  H1('9. Strategy 3 — Secured private credit via Capital SL Premium  [HIGH]'),
  rec('Allocate an initial $200,000 to private credit through the Capital SL Premium facility — short-term loans secured by a first registered mortgage over residential property — as a measured first step, with capacity to increase over time as you become comfortable.'),
  H3('How it works'),
  bullet('Short-term loans (typically 6–18 months) to asset-rich borrowers, secured by a first registered mortgage over residential property (typically valued at $2,000,000–$3,000,000);'),
  bullet('Conservative loan-to-value ratios (LVRs) of 30–60%, never exceeding 65% — a substantial equity buffer sits ahead of your capital;'),
  bullet('Target return of approximately 8.5–9% per annum, paid monthly; and'),
  bullet('Relatively short capital-commitment periods, after which capital can be redeployed or returned.'),
  H3('Why this is appropriate for you'),
  P('This roughly doubles the income yield of your term deposit while providing asset-backed security and a short commitment period that suits your preference for flexibility. Consistent with building comfort gradually, I recommend starting with $200,000; once you have experienced the income and the return of capital on a completed loan, we can review increasing the exposure. It is not a like-for-like replacement for a term deposit — your capital is at risk and is not guaranteed.'),
  table(['Feature', 'Term deposit (current)', 'Private credit (Capital SL Premium)'], [
    ['Target return', '~4% p.a.', '~8.5–9% p.a., paid monthly'],
    ['Security', 'Government-guaranteed to $250k per ADI (FCS)', 'First registered mortgage over property (LVR ≤65%)'],
    ['Your capital', 'Capital-stable and guaranteed', 'At risk — not guaranteed, not FCS-covered'],
    ['Liquidity', 'Access at maturity (short terms)', 'Committed for the loan term (6–18 months)'],
    ['Regulation', 'APRA-regulated bank/ADI', 'Not APRA-regulated'],
    ['Recommended amount', '—', '$200,000 initial (staged)'],
  ], [22, 38, 40]),
  H3('How to implement'),
  P('Before committing, read the Capital SL Premium Information Memorandum and risk summary in full; assess each specific loan (security, LVR, term, borrower) against your risk profile as it arises; commit the initial $200,000 from cash; hold in the most appropriate structure (Section 12).'),
  H3('Risks / consequences'),
  callout([
    new Paragraph({ spacing: { after: 0, line: 276 }, children: [run('Private credit — risks you must accept. ', { bold: true, color: ACCENT }), run('Your capital is at risk and is NOT capital-guaranteed — unlike a term deposit it is not covered by the Financial Claims Scheme and is not APRA-regulated. It is illiquid: your capital is committed for the loan term (6–18 months). Returns and return of capital depend on borrowers repaying; on default, recovery depends on enforcing the mortgage and selling the security property, which takes time and may not recover the full amount. The security property’s value can fall (the ≤65% LVR buffers but does not remove this risk). You rely on Capital SL Premium’s loan selection, due diligence, valuations and administration. The 8.5–9% is a target, not a guarantee. It is sized as a small allocation so that, even in a poor outcome, your income and core capital are not compromised.', { size: 19 })] }),
  ]),

  // ── STRATEGY 4 ──
  H1('10. Strategy 4 — Diversified managed portfolio (CFS Lakeside MS Balanced)  [HIGH]'),
  rec('Invest approximately $600,000 into the Lakeside Managed Solutions (MS) Balanced Portfolio (a 60/40 growth/defensive multi-asset portfolio of 16 underlying funds), held on the CFS FirstChoice Wholesale Investments platform (outside super), managed by Lakeside for a 0.75% p.a. adviser fee.'),
  H3('Why this is appropriate for you'),
  P('This gives you genuine diversification across all major asset classes — Australian and global shares, Australian and global fixed interest, property/infrastructure and cash — in a single, professionally managed and rebalanced portfolio, held outside super so it remains fully liquid. At roughly 60% growth / 40% defensive it aligns with the balanced-with-growth-tilt profile I have assumed, and it is a direct corrective to your current position where your only market investment is a single, concentrated cryptocurrency holding. The portfolio and its cost are set out in full in Section 24 and Appendix G.'),
  H3('How to implement'),
  P('Confirm your formal risk profile; establish the CFS FirstChoice Wholesale Investments account in the appropriate ownership structure (Section 12); invest the ~$600,000 into the Lakeside MS Balanced model; set up the 0.75% p.a. ongoing advice arrangement with written fee consent and a Fee Disclosure Statement.'),
  H3('Risks / consequences'),
  P('This is a market-linked investment: its value will rise and fall with markets and returns are not guaranteed — it is a medium-to-long-term holding (at least 5–7 years). The Balanced model is not auto-rebalancing, so rebalancing is actively managed by me. If your confirmed risk profile differs materially, a different Lakeside MS model can be selected.'),

  // ── STRATEGY 5 — HOLDING / SELL DISCIPLINE ──
  H1('11. Strategy 5 — Investment holding periods, review & sell discipline  [HIGH]'),
  rec('Adopt a clear intended holding period and a review/sell discipline for each investment, and sequence any asset sales to minimise capital gains tax (CGT).'),
  H3('Why this is appropriate for you'),
  P('A written discipline matches each investment to its job, prevents ad-hoc decisions driven by short-term market noise, and — importantly for a high earner — captures the tax levers on the way out (the 50% CGT discount for assets held over 12 months, and realising gains through a lower-rate owner). It answers the practical question of “how long do we hold, and when do we sell?” for each part of the plan.'),
  table(['Investment', 'Intended holding period', 'Review / sell discipline'], [
    ['Cash reserve', 'Ongoing', 'Draw as needed; replenish from income and matured private-credit capital.'],
    ['Private credit', 'Per loan term (6–18 months)', 'Capital returns at each loan maturity; reassess and redeploy each cycle; scale up only after experience.'],
    ['CFS MS Balanced', '5–7+ years', 'Rebalance to target when any asset class drifts >5%; sell to fund a goal or if your risk profile changes — not in response to short-term market moves.'],
    ['Investment bond', '10+ years', 'Avoid withdrawals in the first 10 years (tax); draw for education past the 10-year mark where possible.'],
    ['Super / SMSF', 'To preservation (age 60 & retirement)', 'Long-term; switch investments within super rather than withdrawing.'],
    ['Commercial property (in SMSF)', '10+ years', 'Long-term hold for income + growth; review on lease expiry or vacancy.'],
    ['Cryptocurrency (XRP)', 'Long-term satellite', 'Do not add; trim if it grows beyond a small share of your wealth.'],
  ], [22, 24, 54]),
  H3('CGT sequencing'),
  bullet('Hold assets for more than 12 months to access the 50% CGT discount before selling where possible.'),
  bullet('Realise gains through the lower-rate owner (Jade / the family trust) or, later, inside super in pension phase (0% tax) — not in Quenton’s personal name at 47%.'),
  bullet('Time any discretionary sales for lower-income years, and offset gains with any available capital losses (including the unrealised loss on XRP if ever crystallised).'),
  H3('Risks / consequences'),
  P('Holding disciplines reduce, but do not remove, market and timing risk; tax outcomes depend on current law and your circumstances at the time of sale. We will apply this discipline through the ongoing review service (Section 30).'),
  leg('ITAA 1997 Div 115 (50% CGT discount); s102-5 (net capital gain).'),

  // ── STRATEGY 6 — OWNERSHIP ──
  H1('12. Strategy 6 — Tax-effective ownership & the family trust  [HIGH]'),
  rec('Hold new income-producing investments (the private credit and the managed portfolio) in the most tax-effective structure available to you — using your existing family trust and/or Jade’s personal name — rather than in Quenton’s name.'),
  H3('Why this is appropriate for you'),
  P('How your investments are owned matters as much as what you invest in. There is a large gap between your marginal rates — Quenton ~47% and Jade ~18% — and you already have an established family (discretionary) trust set up to stream income to Jade. Income held in Quenton’s name is taxed at ~47%; held via the trust (distributing to Jade or other adult beneficiaries) or in Jade’s name, it can be taxed at materially lower rates. Legitimately shifting the ownership of income-producing assets is one of the highest-value, lowest-risk parts of this advice.'),
  H3('Tax on $10,000 of investment income — by owner (illustrative)'),
  table(['Owner / structure', 'Tax rate', 'Tax on $10,000', 'Net kept'], [
    ['Quenton (personal name)', '~47%', '$4,700', '$5,300'],
    ['Family trust → distributed to Jade', '~18%', '$1,800', '$8,200'],
    ['Investment bond (tax-paid internally)', '30%', '$3,000', '$7,000'],
    ['Superannuation (accumulation)', '15%', '$1,500', '$8,500'],
    ['Minor child (do NOT use — penalty)', 'up to 47%', 'up to $4,700', '$5,300'],
  ], [38, 18, 22, 22]),
  P('Illustrative, before franking credits (which reduce the tax further on Australian-share income).', { italics: true, color: GREY }),
  callout([
    new Paragraph({ spacing: { after: 0, line: 276 }, children: [run('Important — do not distribute trust income to your children. ', { bold: true, color: ACCENT }), run('Brooklyn (13) and Parker (8) are minors. Distributions of investment (“unearned”) income from a discretionary trust to minors are taxed at penalty rates — effectively the top marginal rate on amounts over $1,308 per year. So the trust’s tax advantage comes from streaming income to adult beneficiaries (principally Jade), NOT the children. This changes once each child turns 18. Capital gains on assets held over 12 months qualify for the 50% CGT discount, and the trust can stream gains and franked dividends to beneficiaries — confirm the detailed trust tax treatment with your accountant.', { size: 19 })] }),
  ]),
  H3('How to implement'),
  P('Before implementing the private credit and managed-portfolio investments, decide with me and your accountant the ownership of each — weighing tax, access, control, asset protection and your estate intentions. Confirm the exact legal owner of the $2,200,000 term deposit (the profile lists “Amanda”, assumed a data-entry error). [TO CONFIRM ownership before implementation.]'),
  H3('Risks / consequences'),
  P('Ownership structuring must be balanced against access and control, depends on current tax law, and the trust incurs its own administration/accounting costs. Any restructure of existing assets could trigger tax or duty and must be confirmed with your accountant first.'),
  leg('ITAA 1936 Div 6AA (minor beneficiary penalty rates); ITAA 1997 Div 115 (50% CGT discount).'),

  // ── STRATEGY 7 — INVESTMENT BOND ──
  H1('13. Strategy 7 — Tax-effective investment bond  [MEDIUM]'),
  rec('Invest approximately $150,000 into an investment (insurance) bond, earmarked for medium-to-long-term goals including your children’s education (Section 14).'),
  H3('Why this is appropriate for you'),
  P('An investment bond is a tax-paid structure: earnings are taxed inside the bond at a maximum of 30% (rather than at Quenton’s ~47%), and no personal tax is payable on withdrawals after 10 years. You can add to it each year (up to 125% of the prior year’s contribution) without restarting the 10-year clock, and you can nominate beneficiaries. For a high earner with money earmarked for a long-term purpose, a bond is a tax-effective complement to the trust and super — with none of super’s preservation lock-up.'),
  table(['Feature', 'How it works'], [
    ['Internal tax rate', 'Earnings taxed at a maximum of 30% inside the bond — vs Quenton’s ~47% marginal rate'],
    ['10-year rule', 'No personal tax on withdrawals once the bond has been held 10 years'],
    ['125% rule', 'You can add up to 125% of the prior year’s contribution each year without resetting the 10-year clock'],
    ['Access', 'Withdraw at any time (unlike super); early withdrawals may create assessable income, with a 30% tax offset'],
    ['Beneficiaries', 'You can nominate beneficiaries — useful for the education and estate goals'],
    ['Recommended amount', '$150,000'],
  ], [26, 74]),
  H3('How to implement'),
  P('Select an investment bond from Pareto’s Approved Product List (for example, a Generation Life or Australian Unity bond), invested in a diversified/balanced option consistent with your risk profile; contribute ~$150,000 initially and consider annual top-ups within the 125% rule.'),
  H3('Risks / consequences'),
  P('The 30% internal rate only benefits you while your marginal rate exceeds 30% (Quenton’s does; Jade’s does not — so this is a Quenton-side strategy). Withdrawals within 10 years can create assessable income (with a 30% offset). The underlying options are market-linked and not guaranteed, and the bond carries its own fees.'),
  leg('ITAA 1936 s26AH (10-year rule for insurance/investment bonds).'),

  // ── STRATEGY 8 — EDUCATION ──
  H1('14. Strategy 8 — Education funding for Brooklyn & Parker  [MEDIUM]'),
  rec('Establish a dedicated education-funding pool — primarily through the investment bond in Section 13 — to meet the current ~$20,000 p.a. of private-school fees and the higher costs of the secondary and tertiary years ahead.'),
  H3('Why this is appropriate for you'),
  P('Brooklyn and Parker already attend private school at ~$10,000 p.a. each, and these costs typically rise materially through secondary and tertiary study. Ring-fencing capital gives you certainty that the fees are funded regardless of markets or income. The investment bond suits this well: it is tax-effective for a high earner and avoids the minor-beneficiary penalty that would apply if you funded fees by distributing trust income to the children (Section 12).'),
  H3('How to implement'),
  P('Allocate a portion of the ~$150,000 bond to the education goal; project the fee timeline for both children; draw fees from the bond and its earnings as they fall due, ideally after the 10-year mark where timing allows.'),
  H3('Risks / consequences'),
  P('Education costs can rise faster than assumed; the underlying investments are market-linked; drawing on the bond in its early years can create assessable income (Section 13). Review the funding adequacy at each annual review.'),

  // ── STRATEGY 9 — ESTABLISH SMSF ──
  H1('15. Strategy 9 — Establish a self-managed super fund (SMSF)  [HIGH]'),
  rec('Establish a self-managed super fund with both of you as members, using a corporate trustee, and roll in your existing superannuation (Quenton’s CBUS ≈$400,000 and Jade’s balance).'),
  H3('Why this is appropriate for you'),
  P('You have told me you are thinking about an SMSF and want to hold commercial property in super — which retail and industry funds do not permit. An SMSF gives you direct control over your super investments and the ability to acquire direct property (Section 17). With your existing balances plus the planned contributions (Section 16), your combined fund balance is sufficient to make an SMSF cost-effective. A corporate trustee is recommended: it simplifies membership changes, keeps fund assets clearly separated, and assists succession and continuity.'),
  table(['Item', 'Detail'], [
    ['Members / trustees', 'Quenton & Jade, as directors of a corporate trustee'],
    ['Setup cost', '≈$1,500–$3,000 one-off (deed + trustee company) [TO CONFIRM]'],
    ['Annual running cost', '≈$3,000–$5,000 p.a. (administration + independent audit + ASIC) [TO CONFIRM]'],
    ['Your duties', 'Personally responsible for compliance: documented investment strategy, sole-purpose test, annual audit and reporting'],
    ['Insurance', 'The fund must consider members’ insurance needs (links to Section 22)'],
    ['Suitability', 'Cost-effective at your combined balance; requires time, diligence and record-keeping'],
  ], [28, 72]),
  H3('How to implement'),
  P('Establish the trustee company and trust deed with our SMSF specialist/accountant; register the fund with the ATO; open the fund’s bank and (where relevant) broking accounts; roll in your existing super after confirming any exit fees or insurance held in the current funds should be preserved or replaced first (coordinate with Section 22); prepare and sign the fund’s investment strategy and binding death benefit nominations.'),
  H3('Risks / consequences'),
  P('As trustees you are personally responsible for the fund’s compliance and can face penalties for breaches; there is an ongoing cost and administrative burden; you must maintain a documented investment strategy and not breach the sole-purpose test. Check any insurance held inside your current funds before rolling out (do not lose valuable cover — Section 22). Capacity and estate matters (binding nominations, Powers of Attorney) are important while an SMSF is held.'),
  leg('SIS Act 1993 (Cth) & SIS Regulations; sole-purpose test (s62); investment strategy (reg 4.09); trustee covenants (s52A/52B).'),

  // ── STRATEGY 10 — MOVE MONIES INTO SUPER ──
  H1('16. Strategy 10 — Move monies into super (contribution glide path)  [HIGH]'),
  rec('Over the next 1–3 years, move approximately $660,000 of surplus cash into the SMSF — via a non-concessional (after-tax) bring-forward contribution of up to $600,000 combined and catch-up concessional contributions of ≈$60,000 for Quenton — and continue ongoing concessional contributions each year.'),
  H3('Why this is appropriate for you'),
  P('Superannuation is the most tax-effective long-term structure available to you: earnings are taxed at 15% (0% once in pension phase) versus Quenton’s ~47%, and it is the vehicle that will hold the commercial property (Section 17). Moving surplus cash into super now — while you have it — builds the balance needed for that purchase and compounds in a low-tax environment for the long term. The glide path below sequences the contributions within the caps.'),
  table(['Contribution', 'Who', 'Amount', 'Cap / rule'], [
    ['Roll-in of existing super', 'Both', '≈$400k (Q) + Jade’s balance', 'No cap — a transfer, not a contribution'],
    ['Catch-up concessional', 'Quenton', '≈$60,000 (once tax returns lodged)', 'Carry-forward; total super balance < $500k'],
    ['Ongoing concessional', 'Quenton', '≈$5,000/yr to the $30,000 cap', 'Concessional cap $30,000 (incl. employer)'],
    ['Non-concessional (bring-forward)', 'Both', 'up to $360,000 each ($600k used)', 'Bring-forward; age < 75; TSB test'],
    ['Spouse contribution', 'Quenton → Jade', '$3,000/yr', '$540 offset (Section 19)'],
  ], [30, 16, 26, 28]),
  H3('The tax saving on the catch-up concessional (≈$60,000, illustrative)'),
  table(['', 'Take as salary', 'Contribute to super'], [
    ['Amount', '$60,000', '$60,000'],
    ['Tax rate', '~47% (marginal)', '15% (contributions tax)'],
    ['Tax paid', '≈$28,200', '$9,000'],
    ['Ends up as', '≈$31,800 in hand', '$51,000 in super'],
    ['Tax saved', '—', '≈$19,200'],
  ], [28, 36, 36]),
  callout([
    new Paragraph({ spacing: { after: 0, line: 276 }, children: [run('Condition — tax returns first, and mind the caps. ', { bold: true, color: ACCENT }), run('The catch-up concessional strategy cannot be implemented until your outstanding tax returns are finalised (Section 23), because the deduction and your available carry-forward cap depend on your assessed income and prior contributions. The non-concessional bring-forward is capped at $360,000 per person over three years and is subject to your total super balance — we will confirm both against ATO records before contributing. Non-concessional contributions are staged so as not to strip your liquidity.', { size: 19 })] }),
  ]),
  H3('How to implement'),
  P('After the tax returns are lodged, confirm Quenton’s carry-forward concessional cap and both of your non-concessional bring-forward eligibility with the ATO; make the non-concessional contributions from cash (staged, e.g. $360k Quenton + $240k Jade); make the catch-up concessional contribution and lodge a notice of intent to deduct before 30 June; arrange ongoing concessional contributions (salary sacrifice or personal deductible) up to the cap each year.'),
  H3('Risks / consequences'),
  P('Super is preserved — generally not accessible until age 60 and retirement (or 65). This is long-term money, sized against your $500,000 cash reserve and liquid managed portfolio so you keep flexibility. Exceeding a cap triggers excess-contributions tax; caps, the transfer balance cap and super rules can change.'),
  leg('ITAA 1997 Div 291 (concessional cap); s291-20 (carry-forward, TSB < $500,000); s290-170 (notice of intent); s292 (non-concessional cap & 3-year bring-forward); s290-230 (spouse offset).'),

  // ── STRATEGY 11 — COMMERCIAL PROPERTY IN SMSF ──
  H1('17. Strategy 11 — Acquire commercial property within the SMSF  [HIGH]'),
  rec('Once the SMSF is funded, acquire a commercial property inside the fund using a limited recourse borrowing arrangement (LRBA) — enabling a higher-value, better-quality asset (indicatively ~$1,600,000) than the fund could buy outright — for its higher income yield and long-term growth in the concessionally-taxed super environment. The full LRBA strategy, worked example and risks are set out in Section 17A; buying a smaller property (~$1,100,000) outright remains a lower-risk alternative.'),
  H3('Why this is appropriate for you'),
  bullet('Commercial property typically yields more than residential (net ~5–6%+), with longer leases and tenant-paid outgoings — a strong income complement to your other assets.'),
  bullet('Held in super, rental income is taxed at 15% (0% in pension phase) and capital gains at 10% (0% in pension phase) after 12 months — far below Quenton’s 47%.'),
  bullet('It uses super for what it does best — a long-term, income-producing, tax-advantaged hold — and is the specific reason an SMSF is worth establishing for you.'),
  bullet('If you own or later acquire a business, the SMSF can hold your business premises as “business real property” and lease it back at arm’s length — a genuine SMSF advantage.'),
  H3('Structure options'),
  table(['Approach', 'How it works', 'Notes'], [
    ['Outright purchase', 'The SMSF buys the property using its own cash', 'Simplest; no borrowing; needs sufficient fund balance (your glide path targets this).'],
    ['LRBA (borrowing)', 'The SMSF borrows via a limited-recourse loan, with the asset held in a separate holding (bare) trust until repaid', 'Enables a higher-value property; strict rules apply; a lender and a liquidity buffer in the fund are required.'],
    ['Business real property', 'The SMSF acquires/leases premises used wholly in a business, at market rent', 'Only where it is genuine business real property; an exception to the related-party and in-house asset rules.'],
  ], [22, 46, 32]),
  callout([
    new Paragraph({ spacing: { after: 0, line: 276 }, children: [run('Commercial property in super — risks you must accept. ', { bold: true, color: ACCENT }), run('Concentration: a single large, illiquid asset would dominate the fund — the fund must still pay expenses, insurance and (later) minimum pensions, so keep a cash buffer inside the SMSF. Vacancy and tenant risk can interrupt income. Property values can fall. An LRBA has strict rules (a single acquirable asset, limited recourse, and no substantial improvements funded by borrowings) and adds interest cost and lender requirements. All dealings must satisfy the sole-purpose test and be on arm’s-length terms. Specific property selection and due diligence is a separate step and must be assessed on its merits.', { size: 19 })] }),
  ]),
  H3('How to implement'),
  P('Fund the SMSF per Section 16; set the fund’s investment strategy to permit direct property (and borrowing, if used); identify a suitable commercial property within budget; if borrowing, establish the LRBA holding trust and an SMSF loan before exchange; retain a cash buffer in the fund for expenses and minimums; ensure any lease is on arm’s-length terms. Property due diligence and selection to be completed as a separate step. [TO CONFIRM target property, price, yield and whether borrowing is used.]'),
  H3('Risks / consequences'),
  P('See the risk box above. In addition, buying and selling property incurs significant transaction costs (stamp duty, legals, agent fees), so it is a long-term hold; and the fund’s diversification must be considered in its investment strategy given the property’s size relative to the fund.'),
  leg('SIS Act 1993 s67A–67B (limited recourse borrowing); s66 (acquisitions from related parties; business real property exception); s71 (in-house assets); s62 (sole-purpose test); reg 4.09 (investment strategy).'),

  // ── STRATEGY 11A — LRBA ──
  H1('17A. Strategy 11A — Fund the property with a limited recourse borrowing arrangement (LRBA)  [HIGH]'),
  rec('Acquire the commercial property using a limited recourse borrowing arrangement (LRBA): the SMSF contributes ≈35% equity (~$560,000) and borrows ≈65% (~$1,040,000) to acquire a ~$1,600,000 property — enabling a larger, better-quality asset than the fund could buy outright, while retaining a cash buffer and diversified investments inside the fund.'),
  H3('How an LRBA works'),
  bullet('The SMSF borrows to buy a single acquirable asset — here, the commercial property.'),
  bullet('The asset is held in a separate holding trust (a bare / custodian trust); a custodian company holds the legal title, while the SMSF holds the beneficial interest and receives the rent.'),
  bullet('The lender’s recourse on default is limited to the property only — the fund’s other assets are protected (this is what makes it “limited recourse”).'),
  bullet('Members usually provide a personal guarantee, but the guarantee’s recourse is also limited to the property.'),
  bullet('Once the loan is repaid, legal title can be transferred from the holding trust to the SMSF without a new CGT event (if done correctly).'),
  H3('Worked funding example (on a $1,600,000 property)'),
  table(['Item', 'Amount'], [
    ['Property purchase price', '$1,600,000'],
    ['LRBA loan (≈65% LVR)', '$1,040,000'],
    ['SMSF equity contribution (≈35%)', '$560,000'],
    ['Acquisition costs (stamp duty, legal, lender, holding trust)', '≈$95,000'],
    ['Total funded by the SMSF at purchase', '≈$655,000'],
    ['SMSF cash & investments retained after purchase', '≈$545,000'],
  ], [62, 38]),
  H3('Can the fund service the loan? (annual, illustrative)'),
  table(['Item', 'Amount p.a.'], [
    ['Net rental income (≈5.5% on $1.6m)', '≈$88,000'],
    ['Less loan interest (≈7% on $1,040,000)', '≈($72,800)'],
    ['Net property cash flow', '≈$15,200'],
    ['Plus ongoing concessional contributions (net of 15%)', '≈$25,500'],
    ['Plus earnings on retained SMSF investments (~$395k)', '≈$25,700'],
    ['Less SMSF running costs', '≈($4,000)'],
    ['Net surplus — available to reduce the loan', '≈$62,400'],
  ], [62, 38]),
  P('The rent largely covers the interest on its own; contributions and the retained investments then generate a comfortable surplus to pay down the loan and rebuild the buffer. Illustrative only — rates, rent and contributions will vary.', { italics: true, color: GREY }),
  H3('Why this is appropriate for you'),
  bullet('It lets the SMSF control a larger, higher-quality, better-located commercial property than its ~$1.2m balance could buy outright.'),
  bullet('The rent largely services the interest, and contributions plus retained-asset earnings accelerate repayment — so the fund is not cash-strained.'),
  bullet('Interest is deductible against the fund’s income (at 15%); rent is taxed at 15% (0% in pension phase) and gains at 10% (0% in pension phase) after 12 months.'),
  bullet('Over the long term, as the loan amortises and the fund reaches pension phase, you hold a substantial unencumbered, income-producing asset with tax-free rent and gains.'),
  H3('The rules an LRBA must follow'),
  bullet('A single acquirable asset, held in a compliant holding (bare) trust.'),
  bullet('The borrowing must be limited recourse — the lender can only take the property, not the fund’s other assets.'),
  bullet('Borrowed funds cannot be used to make substantial improvements that change the asset’s character (repairs and maintenance are permitted).'),
  bullet('All dealings must be arm’s length and satisfy the sole-purpose test; a related-party loan must meet the ATO safe-harbour terms to be treated as arm’s length.'),
  bullet('Refinancing is permitted only under strict conditions.'),
  H3('How to implement'),
  P('Confirm the SMSF investment strategy permits direct property and borrowing; obtain an SMSF LRBA loan pre-approval (SMSF commercial loans have fewer lenders, higher rates and larger deposit requirements — typically ≤65–70% LVR); establish the holding (bare) trust with a corporate custodian trustee before contracts are exchanged; retain a cash buffer in the fund (≈$150,000) for interest, expenses, insurance and future minimum pension payments; complete property due diligence (valuation, lease, tenant, building) as a separate step; ensure the property is insured and any lease is on arm’s-length terms.'),
  H3('Risks / consequences'),
  callout([
    new Paragraph({ spacing: { after: 0, line: 276 }, children: [run('Gearing inside super — risks you must accept. ', { bold: true, color: ACCENT }), run('Gearing magnifies gains AND losses — a fall in the property’s value is amplified against your equity. SMSF loan interest rates are higher than standard mortgages (~7%+) and can rise. Vacancy or a tenant default still leaves the loan to be serviced — the cash buffer and contributions are your protection. Liquidity is tight: a large, geared, illiquid asset can strain the fund’s ability to pay expenses and, later, minimum pension drawdowns. Contribution caps limit how quickly you can inject cash to service or repay the loan. If a member dies or loses capacity, the fund may be forced to sell at a poor time — so binding nominations and Powers of Attorney (Section 21) matter. LRBA rules are strict and breaches are costly. Gearing only enhances returns if the total property return (rent + growth) exceeds the borrowing cost over time.', { size: 19 })] }),
  ]),
  H3('Is gearing worth it? — an honest view'),
  P('Borrowing at ~7% to hold an asset yielding ~5.5% plus ~3% growth (a total return of ~8.5%) is modestly accretive, and the benefit builds over the long term as the loan amortises and the fund reaches tax-free pension phase. The real advantage is being able to own a larger, better asset now and let the tenant and your contributions pay it down. If you would prefer lower risk, the alternative is to buy a smaller (~$1,100,000) property outright (Section 17) — less upside, but no gearing risk and simpler administration. This is a genuine choice; I have set out both so you can decide with the trade-off in front of you.'),
  leg('SIS Act 1993 s67A–67B (limited recourse borrowing arrangements); s67B (single acquirable asset); ATO PCG 2016/5 (safe-harbour terms for related-party LRBAs); s62 (sole-purpose test); s66 (business real property); s71 (in-house assets).'),

  // ── STRATEGY 12 — PROJECTIONS ──
  H1('18. SMSF & superannuation projections  [ILLUSTRATIVE]'),
  P('The projections below illustrate how the SMSF could grow under the recommended strategy. They are illustrative only, are not guaranteed, and will vary with contributions, returns, property performance and legislation.'),
  H2('Assumptions'),
  P('Roll-ins ≈$400,000 (Quenton) + ≈$150,000 (Jade — [TO CONFIRM]); non-concessional contributions $600,000; catch-up concessional ≈$60,000 (≈$51,000 net of 15% tax); a commercial property of ~$1,600,000 acquired via an LRBA (loan ~$1,040,000 at ~65% LVR) yielding ~5.5% net income plus ~3% p.a. growth; the loan reduced from the fund’s net surplus (~$60,000 p.a.) plus ongoing concessional contributions (~$30,000 p.a.); a blended net return of ~6.5% p.a. on the fund’s other (non-property) assets; Quenton retires around age 60 (≈11 years); figures rounded. [TO CONFIRM all inputs — a formal projection will be run before implementation.]', { italics: true, color: GREY }),
  H2('Geared scenario (LRBA — recommended)'),
  table(['Milestone', 'Property value', 'Loan balance', 'Other SMSF assets', 'Net SMSF position'], [
    ['Year 0 — purchase ($1.6m via LRBA)', '$1,600,000', '$1,040,000', '≈$545,000', '≈$1,105,000'],
    ['Quenton age 55 (≈6 yrs)', '≈$1,910,000', '≈$820,000', '≈$700,000', '≈$1,790,000'],
    ['Quenton age 60 (≈11 yrs) — retirement', '≈$2,210,000', '≈$540,000', '≈$930,000', '≈$2,600,000'],
    ['Pension phase (loan repaid over time)', 'tax-free', '→ nil', 'tax-free', 'unencumbered'],
  ], [30, 18, 16, 18, 18]),
  P('Gearing lets the fund control a $1,600,000 asset from a ~$560,000 equity base — the tenant and your contributions pay down the loan over time. In this deliberately conservative illustration (3% growth, 7% interest) the net position at 60 is similar to an ungeared ~$1.1m purchase, but the geared fund holds a larger, better-quality asset with greater long-term growth potential — and correspondingly greater downside if property values fall or rates rise. At pension phase, rental income and capital gains inside the fund can become tax-free, and pension payments are tax-free in your hands from age 60 — the pay-off for the long-term preservation commitment. The projection will be refined with your actual balances, the chosen property, the loan terms and a formal modelling tool before anything is implemented.', { italics: true, color: GREY }),
  leg('ITAA 1997 s295-385 (exempt current pension income); Subdiv 294-B (transfer balance cap); SIS Regs (minimum pension drawdowns).'),

  // ── STRATEGY 13 — JADE INCENTIVES ──
  H1('19. Strategy 13 — Boost Jade’s super: spouse contribution, co-contribution & LISTO  [MEDIUM]'),
  rec('Capture the low-income super incentives available through Jade: Quenton to make a spouse contribution of up to $3,000 to Jade’s super (for a $540 offset); Jade to make a $1,000 personal after-tax contribution for the government co-contribution (up to $500); and ensure Jade receives the Low Income Super Tax Offset (LISTO, up to $500).'),
  H3('Why this is appropriate for you'),
  P('Jade’s income (~$40,000) unlocks incentives that Quenton’s income cannot access — among the highest guaranteed returns available.'),
  table(['Incentive', 'What you do', 'Benefit', 'Key condition'], [
    ['Spouse contribution offset', 'Quenton contributes up to $3,000 to Jade’s super', 'Up to $540 tax offset to Quenton', 'Jade’s income < $37k (phases out to $40k)'],
    ['Government co-contribution', 'Jade contributes $1,000 after-tax', 'Up to $500 from the government', 'Income < $45,400; 10% from work'],
    ['LISTO', 'Automatic on Jade’s concessional contributions', 'Up to $500 refunded to her fund', 'Income < $37k'],
  ], [24, 34, 22, 20]),
  H3('How to implement'),
  P('Jade contributes $1,000 before 30 June without lodging a notice of intent to deduct (otherwise it becomes concessional and is disqualified from the co-contribution); Quenton contributes up to $3,000 to Jade’s super and claims the offset at item T3; lodge Jade’s tax return showing her work income so the ATO pays the co-contribution and LISTO. [TO CONFIRM Jade’s exact assessed income to size the spouse offset.]'),
  H3('Risks / consequences'),
  P('The spouse offset reduces as Jade’s income approaches $40,000; the incentives require Jade to keep earning income from work; contributions are preserved and count toward her non-concessional cap (ample headroom). Amounts are small relative to your wealth, but the returns on them are very high.'),
  leg('ITAA 1997 s290-230 (spouse offset); Super (Government Co-contribution for Low Income Earners) Act 2003; ITAA 1997 Subdiv 312 (LISTO).'),

  // ── STRATEGY 14 — CRYPTO ──
  H1('20. Strategy 14 — Manage your cryptocurrency (XRP) position  [MEDIUM]'),
  rec('Retain your existing XRP holding (~$250,000, held in the family trust) as a small, capped satellite; make no further purchases as part of this advice; and do not let it exceed a modest share of your portfolio.'),
  H3('Why this is appropriate for you'),
  P('You have a long-term conviction in the asset class, and at ~$250,000 the holding is roughly 8–9% of your net worth — a size that, even if it fell to zero, would not compromise your security. It is currently down ~50%; crystallising that loss is not necessary given it is already appropriately sized and held long-term (though the capital loss could be useful to offset gains elsewhere — Section 11). I recommend treating it as a high-risk satellite, not a core holding; the diversified portfolio and the other strategies build ballast around it.'),
  H3('How to implement'),
  P('Retain within the family trust; do not add to it; monitor its share of total wealth and rebalance (by not adding, and growing the diversified assets around it) if it grows disproportionately; if you ever realise a gain, coordinate the trust distribution with your accountant to stream it tax-effectively to adult beneficiaries (not the minor children — Section 12).'),
  H3('Risks / consequences'),
  P('Cryptocurrency is extremely volatile and speculative; it can fall dramatically or to zero, is largely unregulated, and provides no income. Held in the trust, gains are assessable to the trust/beneficiaries. This is your existing decision; I am advising on position sizing and risk management, not recommending the asset itself.'),

  // ── STRATEGY 15 — ESTATE ──
  H1('21. Strategy 15 — Estate planning & intergenerational wealth  [HIGH — coordinate]'),
  rec('Review and update your own Wills and Powers of Attorney (last reviewed 2018), and progress the two urgent third-party estate matters — your mother’s Will and Jade’s parents’ estate planning — through our solicitor, Doug Patrick.'),
  H3('Why this is appropriate for you'),
  bullet('Your own documents — you both hold Wills with testamentary trusts and POAs, last reviewed in 2018. Given the growth in your wealth, your family trust, an SMSF and your children’s ages, they should be reviewed to ensure they remain effective, tax-effective and asset-protected — and your SMSF should have valid binding death benefit nominations aligned to them.'),
  bullet('Your mother — turning 80, owns a home worth ~$1,000,000, receives the Age Pension, and has no valid Will. This is urgent: dying intestate removes control over who inherits and forgoes a testamentary trust that could stream income tax-effectively to your children (as grandchildren, at adult rates via excepted trust income) and protect the inherited wealth.'),
  bullet('Jade’s parents — aged ~60 with combined assets of ~$2,200,000, should update their Wills with testamentary trust structures. With a combined potential future inheritance of $2,000,000+, proper structuring now can materially reduce future tax leakage.'),
  H3('How to implement'),
  P('I have engaged our in-house solicitor, Doug Patrick, to assist. He will coordinate the review of your Wills and POAs, align your SMSF binding nominations, and establish your mother’s Will (with a testamentary trust), and can assist Jade’s parents. Legal drafting is a separate legal engagement, outside the scope of this SOA.'),
  H3('Risks / consequences'),
  P('Estate documents are prepared by a solicitor; their effectiveness depends on correct drafting and valid nominations. The tax treatment of testamentary trusts depends on current law. Inheritances are not certain and their timing is unknown; this is planning, not a guarantee.'),
  leg('ITAA 1936 s102AG (excepted trust income — testamentary trusts); SIS Act 1993 (binding death benefit nominations); state succession/intestacy legislation (VIC).'),

  // ── STRATEGY 16 — INSURANCE ──
  H1('22. Strategy 16 — Personal insurance review & potential trauma claim  [HIGH — on hold]'),
  rec('Retain all existing insurance and make no changes for now; obtain the histology report from Quenton’s lip-cancer procedure so I can assess a potential trauma claim; then complete a full personal insurance review as separate advice. Check any insurance held inside your current super funds before rolling them into the SMSF (Section 15).'),
  H3('Why this is appropriate for you'),
  P('You currently hold Life and Trauma cover (Quenton) and Life cover (Jade), both on level premiums — generally superior over the long term. Quenton had a cancer removed from his lip ~4–5 years ago; as the trauma policy was in place then, this may give rise to a trauma claim, which could pay a lump sum (partial, with cover continuing at a reduced sum insured, or full, with the trauma cover then ceasing) and may trigger a Financial Planning Benefit (the insurer contributing toward advice costs). The first and most critical step is the histology report; until we have clarity, any broader review or restructuring — and any rollover of super that holds insurance — is on hold.'),
  H3('How to implement'),
  P('Please send the histology report. Once reviewed, I will assess the likelihood of a successful claim and advise on next steps. Do not cancel, alter or lapse any existing cover, and confirm whether your current super funds hold insurance before rolling them into the SMSF. A full insurance needs analysis will follow as separate advice.'),
  H3('Risks / consequences'),
  P('Cancelling or altering cover — including inadvertently through a super rollover — before the claim is assessed could forfeit a valuable benefit. Detailed insurance advice is outside the scope of this SOA and will be provided separately.'),

  // ── STRATEGY 17 — TAX RETURNS ──
  H1('23. Strategy 17 — Finalise the outstanding tax returns  [IMMEDIATE]'),
  rec('Finalise your outstanding tax returns (two or more years outstanding) as a matter of priority, through our accounting partner, Aidan.'),
  H3('Why this is appropriate for you'),
  P('Your returns are outstanding due to complications relating to the Silverado vehicle purchase and logbook requirements, which have affected deduction calculations. Resolving them matters in its own right (an estimated ~$6,000 in refunds across the outstanding years) and is a precondition for the super contribution strategies (Sections 16), which depend on your assessed income and prior-year contribution history. It also ensures the new investments’ income is reported correctly from the outset.'),
  H3('How to implement'),
  P('I will connect you with Aidan to finalise the returns; once lodged, we confirm your carry-forward concessional capacity and non-concessional eligibility, then implement the super strategies before 30 June.'),
  H3('Risks / consequences'),
  P('Delay holds up the super and SMSF strategies and prolongs any ATO exposure. Tax-return preparation and tax advice are provided by the accountant, not under this SOA.'),

  // ── SECTION 24 — PORTFOLIO DETAIL ──
  H1('24. The recommended portfolio — CFS Lakeside MS Balanced'),
  P('This section sets out the recommended managed portfolio (Strategy 4) in detail — the Lakeside Managed Solutions Balanced model, a diversified balanced portfolio of 16 underlying wholesale managed funds, held via CFS FirstChoice Wholesale Investments (outside super). The model you were shown (“Lakeside MS Balanced Portfolio 260224”) is the Personal Super version; because this $600,000 is non-super money, I recommend the identical model held through the Investments (non-super) version of the same funds — same allocation, managers and diversification, only the wrapper differs.'),
  H2('Target asset allocation'),
  table(['Asset class', 'Model target', 'Growth / defensive'], [
    ['Cash', '5.0%', 'Defensive'],
    ['Australian fixed interest', '18.0%', 'Defensive'],
    ['Global fixed interest', '17.0%', 'Defensive'],
    ['Australian shares', '22.5%', 'Growth'],
    ['Global shares', '30.5%', 'Growth'],
    ['Property / infrastructure', '7.0%', 'Growth'],
    ['Total', '100.0%', '≈60% growth / 40% defensive'],
  ], [46, 24, 30]),
  P('The model blends low-cost index funds (CFS Index Australian/Global Shares, Bonds and Property — SSgA and BlackRock make up ~27%) with active satellites (Capital Group, GQG, Magellan, Schroders, Platypus, Pendal, Janus Henderson, Bentham, RQI). The full 16-fund look-through, weights, dollar amounts on $600,000 and each fund’s ICR are in Appendix G.'),
  H2('The cost of the portfolio (on ~$600,000)'),
  table(['Layer', 'Approx. % p.a.', 'Approx. $ p.a.'], [
    ['Lakeside adviser service fee', '0.75%', '$4,500'],
    ['Underlying investment fees (weighted ICR)', '≈0.38%', '≈$2,280'],
    ['CFS platform administration fee', 'per PDS [TO CONFIRM]', 'per PDS'],
    ['Indicative all-in (excl. platform admin/rebates)', '≈1.13% +', '≈$6,780 +'],
  ], [46, 24, 30]),
  P('The 0.75% adviser fee is paid to Lakeside (a conflict — Sections 28 & 29). CFS platform administration and transaction costs apply per the PDS; the FirstChoice Wholesale Investments (non-super) fee schedule may differ slightly from the super version. [TO CONFIRM the Investments-version fee schedule.]', { italics: true, color: GREY }),
  H2('Franking credits & model choice'),
  P('The model’s Australian-share funds (~22.5%) distribute franked dividends, whose franking credits reduce the tax on the portfolio’s income — more valuable still when that income is directed to a lower-rate holder (Section 12). The Balanced (60/40) model is recommended on the assumption of a balanced-with-growth-tilt profile; a more conservative Lakeside MS model is available if your formal risk profile shows lower tolerance. [TO CONFIRM risk profile.]'),

  // ── SECTION 25 — INDICATIVE OUTCOME ──
  H1('25. Indicative outcome — redeploying your surplus cash'),
  P('The table illustrates how I recommend deploying the ~$2,200,000 and the potential return compared with leaving it all in the term deposit. Figures are illustrative only, gross of tax and fees except where stated, not guaranteed, and will vary.'),
  table(['Use of funds', 'Amount', 'Indicative return', 'Indicative $ p.a.'], [
    ['Repay car loan (Strategy 2)', '$90,000', 'Saves ≈7% loan interest', '≈$6,300 saved'],
    ['Cash & emergency reserve (Strategy 1)', '$500,000', '≈4.0–4.25%', '≈$21,300'],
    ['Private credit — Capital SL Premium (Strategy 3)', '$200,000', '≈8.5–9%', '≈$17,500'],
    ['CFS Lakeside MS Balanced (Strategy 4)', '$600,000', '≈6.5% total return', '≈$39,000'],
    ['Investment bond (Strategy 7)', '$150,000', '≈5.5% (after 30% internal tax)', '≈$8,250'],
    ['Into SMSF — non-concessional + catch-up (Strategies 10–11)', '$660,000', 'Property + growth, taxed at 15% / 0%', 'Long-term (see Section 18)'],
    ['Total deployed', '$2,200,000', '', ''],
  ], [42, 15, 25, 18]),
  H2('Comparison with the current position'),
  table(['', 'Current — all cash', 'Recommended allocation'], [
    ['Capital at work', '$2,200,000 @ ~4%', 'Diversified across cash, income, growth, super & property'],
    ['Tax efficiency', 'Fully taxed at ~47% (Quenton)', 'Trust/Jade ownership (~18%), bond (30%) & super (15% / 0%)'],
    ['Diversification', 'None — 100% cash', 'Cash, private credit, global balanced portfolio, commercial property'],
    ['Long-term wealth', 'Low-growth cash', 'Compounding in super + property + growth assets'],
    ['Liquidity', 'High', '≈$1.1m readily accessible outside super; the rest longer-term'],
  ], [24, 30, 46]),
  P('Beyond the headline return, the recommended allocation diversifies your wealth and — through the trust/Jade ownership, the investment bond and superannuation — materially improves your after-tax position over the long term. The recommended mix carries more risk and less liquidity than cash; the ~$500,000 reserve and the liquid managed portfolio are retained precisely to balance the super/property commitment.', { italics: true, color: GREY }),

  // ── SECTION 26 — RISKS ──
  H1('26. Risks, consequences and things you should consider'),
  bullet('Investment risk — the managed portfolio, investment bond and SMSF assets are market-exposed; capital can fall, especially over short periods.'),
  bullet('Private credit risk — capital is at risk and not guaranteed, the investment is illiquid for the loan term, and the 8.5–9% target is not guaranteed (Section 9).'),
  bullet('SMSF, property & gearing risk — you take on trustee responsibilities and cost; a commercial property is illiquid and concentrated, with vacancy and value risk; and the LRBA gears the fund — magnifying both gains and losses, adding interest-rate and refinancing risk, and tightening liquidity (Sections 15, 17, 17A).'),
  bullet('Preservation / liquidity — ≈$660,000 moved into super is preserved until age 60 and retirement; the property is a long-term hold. The ~$500,000 cash reserve and the liquid managed portfolio are your accessible funds.'),
  bullet('Concentration risk — your XRP holding is a single, highly volatile asset; and the commercial property will be a large single holding within the SMSF — both managed by sizing and diversification.'),
  bullet('Interest-rate & inflation risk — cash returns can fall; inflation erodes the real value of cash held long term; borrowing costs (if an LRBA is used) can rise.'),
  bullet('Legislative / tax risk — super (including contribution caps and the transfer balance cap), trust, investment-bond and tax rules can change.'),
  bullet('Conditionality — the super strategies depend on your tax returns being finalised (Section 23); the insurance position depends on the histology report (Section 22).'),
  bullet('If you do nothing — your $2.2M keeps earning a low, fully taxed ~4%; your wealth stays concentrated in cash and a single crypto asset; and the tax, super and estate opportunities go uncaptured.'),

  // ── SECTION 27 — ALTERNATIVES ──
  H1('27. Alternatives I considered'),
  table(['Alternative', 'Why I did not recommend it (or deferred it)'], [
    ['Leave the full $2.2M in cash / term deposits', 'A low, fully taxed ~4% return that will not keep pace with your objectives or inflation; forgoes diversification and tax efficiency.'],
    ['Buy a home now (stop renting)', 'You prefer to remain debt-free and liquid; a rent-vs-buy analysis can be separate advice if your preference changes.'],
    ['Hold the commercial property personally (not in super)', 'Rental income would be taxed at up to ~47% and gains at your marginal rate, versus 15%/0% in super — the SMSF is far more tax-effective for a long-term hold.'],
    ['Use a retail/industry super fund instead of an SMSF', 'Retail/industry funds cannot hold direct commercial property — the SMSF is required to achieve this objective (Section 15).'],
    ['Buy a smaller property (~$1.1m) outright, no borrowing', 'Lower risk and simpler, but forgoes the larger, better-quality asset the LRBA allows; retained as the lower-risk alternative (Sections 17, 17A).'],
    ['Gear more aggressively (higher LVR / larger loan)', 'Increases interest cost, liquidity strain and risk inside super; the recommended ~65% LVR with a cash buffer is the prudent level.'],
    ['Allocate a large / core amount to private credit', 'Too much illiquidity and capital-at-risk; instead a capped, staged $200,000 satellite (Section 9).'],
    ['Direct shares / ETFs (self-managed)', 'Lower cost, but forgoes the professional management, rebalancing and diversification of the managed model; available if you prefer.'],
    ['Buy more cryptocurrency', 'Would increase an already-concentrated, highly speculative exposure; retained but not added to (Section 20).'],
    ['Do nothing', 'Leaves the cash drag, tax inefficiency, concentration and under-used super unaddressed.'],
  ], [34, 66]),

  // ── SECTION 28 — COSTS ──
  H1('28. What this advice costs you'),
  table(['Fee', 'Amount', 'Notes'], [
    ['Initial advice fee (this SOA & implementation)', 'As agreed in our engagement / fee disclosure [TO CONFIRM]', 'May be partly deductible as investment advice — confirm with your accountant.'],
    ['Ongoing adviser fee — CFS Lakeside MS Balanced', '0.75% p.a. of funds managed (≈$4,500 on $600,000)', 'Ongoing fee arrangement with annual fee consent and a Fee Disclosure Statement.'],
    ['Private credit — Capital SL Premium', '0.5% of the amount invested (≈$1,000 on $200,000)', 'Paid to Lakeside — conflict disclosed (Section 29).'],
    ['CFS platform & underlying fund fees', 'Platform admin + ≈0.38% weighted ICR, per the PDS', 'Paid to CFS / underlying managers.'],
    ['Investment bond fees', 'Per the bond provider’s PDS', 'Paid to the bond provider.'],
    ['SMSF establishment & administration', '≈$1,500–$3,000 setup; ≈$3,000–$5,000 p.a. admin/audit [TO CONFIRM]', 'Paid to the SMSF administrator/accountant & ASIC.'],
    ['LRBA — loan & holding trust', 'Holding-trust + loan establishment ≈$2,000–$4,000 one-off; loan interest ~7% p.a. [TO CONFIRM]', 'Paid to the lender and to establish the bare trust.'],
    ['Estate documents (Lakeside Lawyers)', 'Per Doug Patrick’s engagement', 'A separate legal engagement — related-party disclosure (Section 29).'],
    ['Tax-return finalisation (accountant)', 'Per Aidan’s engagement', 'A separate accounting engagement.'],
  ], [30, 34, 36]),
  P('All fees are inclusive of GST where applicable and will be confirmed in writing and consented to before being charged.', { italics: true, color: GREY }),

  // ── SECTION 29 — DISCLOSURES ──
  H1('29. Important information and disclosures'),
  bullet('Responsibility for the advice. Provided by Tristan Biro as an Authorised Representative of Lakeside Financial Pty Ltd, authorised by Pareto Group Pty Ltd (AFSL 418700), which is responsible for the advice.'),
  bullet('Financial Services Guide. You have been provided with the current FSG. [Confirm date provided.]'),
  bullet('Conflict — private credit. Lakeside receives a 0.5% fee in relation to the Capital SL Premium facility — a benefit that could reasonably be expected to influence the advice. I recommend it because I genuinely believe it is appropriate, and have recommended a measured initial allocation; be aware of this interest.'),
  bullet('Conflict — ongoing adviser fee. If you engage Lakeside to manage the CFS portfolio, we earn a 0.75% p.a. ongoing fee — disclosed so you can weigh the recommendation.'),
  bullet('Related party. Lakeside Lawyers (Doug Patrick), preparing/updating your estate documents, is associated with Lakeside Financial. We have referred you to them; you may use any solicitor.'),
  bullet('SMSF responsibility. As trustees you are personally responsible for the fund’s compliance; we and the administrator assist, but the legal responsibility rests with you.'),
  bullet('Approved Product List. I can only recommend products on Pareto Group’s Approved Product List.'),
  bullet('Privacy & basis of advice. Your information is handled per the Pareto Group Privacy Policy. Prepared on the information you provided (Appendix A); tell me if any [TO CONFIRM] item is wrong, as it may change the advice. This advice is valid for 30 days.'),

  // ── SECTION 30 — IMPLEMENTATION ──
  H1('30. Implementation plan — your next steps'),
  table(['Step', 'Action', 'Who', 'When', 'Priority'], [
    ['1', 'Sign and return the Authority to Proceed (Section 32)', 'You', 'On acceptance', '—'],
    ['2', 'Confirm the legal owner of the $2.2M and repay the car loan', 'You / adviser', 'Immediately', 'Immediate'],
    ['3', 'Connect with Aidan to finalise outstanding tax returns', 'You / accountant', 'Immediately', 'Immediate'],
    ['4', 'Complete the risk-profile questionnaire', 'You / adviser', '1–2 weeks', 'High'],
    ['5', 'Establish the cash reserve across multiple ADIs', 'You / adviser', '2–4 weeks', 'High'],
    ['6', 'Decide ownership structure (trust / Jade) for each investment', 'You / adviser / accountant', '2–4 weeks', 'High'],
    ['7', 'Read the Capital SL Premium IM; commit initial $200,000', 'You / adviser', '1–2 months', 'High'],
    ['8', 'Establish CFS account; invest $600,000 in MS Balanced; fee consent', 'Adviser', '1–2 months', 'High'],
    ['9', 'Establish the investment bond ($150,000); set education plan', 'Adviser', '1–2 months', 'Medium'],
    ['10', 'Establish the SMSF (corporate trustee); roll in existing super', 'Adviser / accountant', '1–3 months', 'High'],
    ['11', 'After tax returns: NCC bring-forward, catch-up & ongoing contributions', 'Adviser', 'Before 30 June', 'High'],
    ['12', 'Identify & acquire the commercial property (outright or LRBA)', 'You / adviser / accountant', '3–9 months', 'High'],
    ['13', 'Capture Jade’s spouse contribution / co-contribution / LISTO', 'You / adviser', 'Before 30 June', 'Medium'],
    ['14', 'Send histology report; assess potential trauma claim', 'You / adviser', 'ASAP', 'High'],
    ['15', 'Coordinate estate planning with Doug Patrick (incl. mother’s Will)', 'You / solicitor', '1–3 months', 'High'],
    ['16', 'Annual review of the whole plan (incl. rebalancing & SMSF strategy)', 'You / adviser', 'Annually', 'Ongoing'],
  ], [6, 47, 22, 14, 11]),

  // ── SECTION 31 — INFO NEEDED ──
  H1('31. Information I still need (before this advice is finalised)'),
  bullet('Confirmation of the legal owner of the $2,200,000 term deposit (the profile lists “Amanda”).'),
  bullet('Your completed risk-profile questionnaire.'),
  bullet('The car loan’s interest rate and any early-repayment/break fees.'),
  bullet('Jade’s superannuation balance; whether either current super fund holds insurance; and Jade’s exact assessed income.'),
  bullet('Quenton’s finalised tax returns and ATO carry-forward concessional cap, and both of your non-concessional bring-forward eligibility.'),
  bullet('The Capital SL Premium Information Memorandum and each loan’s details as it arises.'),
  bullet('The CFS FirstChoice Wholesale Investments (non-super) fee schedule and reported returns.'),
  bullet('Target commercial property details (price, yield, lease, tenant) and your SMSF administrator preference.'),
  bullet('SMSF LRBA loan terms — lender, interest rate, LVR, establishment fees and any personal-guarantee requirements.'),
  bullet('The histology report from Quenton’s lip-cancer procedure, and your existing insurance policy schedules.'),
  bullet('Your existing family trust deed and current Wills/POAs.'),

  // ── SECTION 32 — AUTHORITY ──
  H1('32. Authority to proceed'),
  P('I/We, Quenton Gascoigne and Jade Casey, confirm that: I/we have received and read this Statement of Advice and the FSG; the information about our circumstances in Section 2 is correct; the adviser has explained the advice, fees, risks and alternatives, and we have had the opportunity to ask questions; and I/we authorise Lakeside Financial to implement the recommendations ticked below.'),
  table(['Recommendation', 'Proceed?'], [
    ['Establish the structured cash reserve & repay the car loan — §7–8', 'Yes / No'],
    ['Allocate $200,000 to private credit (Capital SL Premium) — §9', 'Yes / No'],
    ['Invest $600,000 in the CFS Lakeside MS Balanced portfolio — §10', 'Yes / No'],
    ['Adopt the holding-period, sell discipline & CGT sequencing — §11', 'Yes / No'],
    ['Structure new investments via the family trust / Jade’s name — §12', 'Yes / No'],
    ['Invest $150,000 in a tax-effective investment bond (education) — §13–14', 'Yes / No'],
    ['Establish a self-managed super fund (SMSF) — §15', 'Yes / No'],
    ['Move ≈$660,000 of cash into super (NCC + catch-up) & contribute ongoing — §16', 'Yes / No'],
    ['Acquire a ~$1.6m commercial property within the SMSF — §17', 'Yes / No'],
    ['Fund it via an LRBA (~65% borrowed), accepting the gearing & liquidity risk — §17A', 'Yes / No'],
    ['Jade’s spouse contribution / co-contribution / LISTO — §19', 'Yes / No'],
    ['Retain XRP as a capped satellite — §20', 'Yes / No'],
    ['Coordinate estate planning (incl. mother’s Will) with Lakeside Lawyers — §21', 'Yes / No'],
    ['Retain all insurance; assess the potential trauma claim — §22', 'Yes / No'],
    ['Finalise outstanding tax returns via the accountant — §23', 'Yes / No'],
  ], [82, 18]),
  spacer(160),
  table(['', 'Quenton Gascoigne', 'Jade Casey'], [['Signature', '', ''], ['Date', '', '']], [24, 38, 38]),
  spacer(160),
  new Paragraph({ children: [run('Adviser: Tristan Biro (FP) — Authorised Representative No. 001313019', { size: 20 })] }),
  new Paragraph({ children: [run('Signature: __________________________     Date: ______________', { size: 20 })] }),
  new Paragraph({ spacing: { before: 200 }, children: [run('Lakeside Financial Pty Ltd — Authorised Representative of Pareto Group Pty Ltd — AFSL 418700 — ABN 11 155 278 078', { size: 16, color: GREY })] }),
  new Paragraph({ children: [run('General advice warning: parts of this document contain general information only. Before acting you should consider its appropriateness having regard to your objectives, financial situation and needs.', { size: 16, color: GREY, italics: true })] }),
];

// ── Appendices ────────────────────────────────────────────────────────────────
const appendix = [
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('APPENDICES', { bold: true, size: 26, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [run('Statement of Advice — Quenton Gascoigne & Jade Casey', { size: 18, color: GREY })] }),

  H1('Appendix A — Information relied upon & assumptions'),
  P('Documents relied upon: Client Profile – Summary (Quenton Gascoigne & Jade Casey, Feb 2026); the Lakeside file-note email chain from the Brighton meeting (Josh Duscher); and the CFS FirstChoice “Lakeside MS Balanced Portfolio 260224” model portfolio report (15 April 2026).'),
  P('Key assumptions: the $2,200,000 term deposit is Quenton’s personal cash (owner to be confirmed); a balanced-with-growth-tilt risk profile (to be confirmed); Quenton’s marginal rate ~47% and Jade’s ~18%; FY26 tax and super thresholds continue; indicative returns as stated (not guaranteed); Quenton’s total super balance under $500,000 (eligible for carry-forward); SMSF and projection assumptions as stated in Sections 15–18. All [TO CONFIRM] items in Section 31 to be verified before implementation.'),

  H1('Appendix B — FY26 marginal tax rates (residents)'),
  table(['Taxable income', 'Income-tax rate', '+ Medicare', 'Combined'], [
    ['$0 – $18,200', '0%', 'nil', '0%'],
    ['$18,201 – $45,000', '16%', '2%', '18%'],
    ['$45,001 – $135,000', '30%', '2%', '32%'],
    ['$135,001 – $190,000', '37%', '2%', '39%'],
    ['$190,001 +', '45%', '2%', '47%'],
  ], [34, 22, 22, 22]),
  P('Quenton (~$225,000) sits in the top bracket (~47%), so concessional contributions, moving income to a lower-rate holder, super (15%) and a 30%-taxed bond deliver large savings. Jade (~$40,000) sits in the 16% bracket (18% with Medicare), with a low effective rate after the Low Income Tax Offset — which is why she is an effective holder of income-producing investments, and why her super value comes from the incentives (spouse offset, co-contribution, LISTO).'),

  H1('Appendix C — Superannuation contribution types (FY26 quick reference)'),
  table(['Type', 'FY26 cap', 'Tax on contribution', 'Key conditions'], [
    ['Concessional (pre-tax)', '$30,000 p.a.', '15% in fund', 'Includes SG, salary sacrifice, personal deductible (notice of intent required).'],
    ['Carry-forward concessional', 'unused prior 5 yrs', '15% in fund', 'Total super balance < $500,000 at 30 June prior FY (Quenton eligible).'],
    ['Non-concessional (after-tax)', '$120,000 p.a.', 'Nil', 'TSB < $2.0M; age < 75.'],
    ['NCC 3-yr bring-forward', 'up to $360,000', 'Nil', 'Age < 75; amount depends on total super balance.'],
    ['Spouse contribution', 'counts to recipient NCC', 'Nil', 'Up to $540 offset; recipient income < $37,000 (phases to $40,000).'],
    ['Government co-contribution', 'up to $500 received', 'Nil', 'Personal NCC up to $1,000; income < $45,400 (full); 10% from work.'],
    ['LISTO', 'up to $500 received', 'Refund of 15% tax', 'Adjusted taxable income < $37,000; automatic.'],
  ], [26, 20, 20, 34]),

  H1('Appendix D — Legislation & references cited'),
  P('Concessional cap (ITAA 1997 Div 291); notice of intent to deduct (s290-170); carry-forward concessional (s291-20); non-concessional cap & bring-forward (s292); spouse contribution offset (s290-230); government co-contribution (Super (Government Co-contribution for Low Income Earners) Act 2003); LISTO (ITAA 1997 Subdiv 312); exempt current pension income (s295-385); transfer balance cap (Subdiv 294-B); 50% CGT discount (Div 115); net capital gain (s102-5); minor-beneficiary penalty rates (ITAA 1936 Div 6AA); excepted trust income — testamentary trusts (ITAA 1936 s102AG); investment/insurance bond 10-year rule (ITAA 1936 s26AH); SMSF rules — SIS Act 1993 & Regs, sole-purpose test (s62), investment strategy (reg 4.09), trustee covenants (s52A/52B), limited recourse borrowing (s67A–67B), acquisitions from related parties & business real property (s66), in-house assets (s71); Financial Claims Scheme (Banking Act 1959); best-interests duty (Corporations Act s961B–961G). Not applicable but noted: Division 296 (super balances over $3M).'),

  H1('Appendix E — Glossary'),
  bullet('Authorised deposit-taking institution (ADI) — a bank/building society/credit union regulated by APRA; deposits covered by the Financial Claims Scheme up to $250,000 per person per ADI.'),
  bullet('Private credit / private lending — lending outside the banking system, here secured by a first registered mortgage; higher interest than a term deposit, at higher risk.'),
  bullet('Loan-to-value ratio (LVR) — the loan as a percentage of the security property’s value; lower LVR = larger equity buffer protecting the lender.'),
  bullet('Managed / diversified portfolio — a professionally managed pool spread across asset classes and underlying funds; liquid but market-linked.'),
  bullet('Franking credits — tax credits attached to franked Australian dividends that reduce the tax payable on that income.'),
  bullet('Concessional contribution — a before-tax super contribution (SG, salary sacrifice, personal deductible); taxed 15% in the fund.'),
  bullet('Non-concessional contribution (NCC) — an after-tax super contribution; not taxed in the fund; a 3-year bring-forward allows up to $360,000 at once.'),
  bullet('Investment (insurance) bond — a tax-paid structure taxed at up to 30% internally; tax-free to the investor after 10 years.'),
  bullet('Self-managed super fund (SMSF) — a super fund you control as trustee, which can hold direct assets including commercial property.'),
  bullet('Limited recourse borrowing arrangement (LRBA) — a permitted way for an SMSF to borrow to buy a single asset, held in a separate holding trust; the lender’s recourse is limited to that asset.'),
  bullet('Business real property — property used wholly and exclusively in a business; an SMSF may acquire it from, and lease it to, a related party at arm’s length.'),
  bullet('Preservation — super generally cannot be accessed until you reach preservation age (60) and retire, or turn 65.'),
  bullet('Testamentary trust — a trust created by a Will, operating on death; provides asset protection and can stream income to minor grandchildren at adult rates.'),

  H1('Appendix F — Your investment approach'),
  P('This appendix records the investment approach underpinning the advice, for review at least annually and whenever your circumstances change materially.'),
  H2('Objectives'),
  bullet('Achieve a real return above inflation over rolling 5–7 year periods on invested (non-reserve) capital, after fees and tax.'),
  bullet('Maintain substantial liquidity (the cash reserve + liquid managed portfolio) for security and opportunities.'),
  bullet('Build long-term, tax-effective wealth through super and a commercial property held in the SMSF.'),
  bullet('Improve after-tax returns through appropriate ownership, the investment bond and superannuation.'),
  H2('Risk profile & horizon'),
  P('Assessed profile: balanced with a growth tilt (to be confirmed); horizon 7+ years for the growth and property assets, with immediate liquidity from the cash reserve and managed portfolio. You accept short-term volatility in the growth sleeve in exchange for long-term real returns.'),
  H2('Target structure of the $2.2M'),
  table(['Sleeve', 'Vehicle', 'Approx.'], [
    ['Liquidity / defensive', 'Cash & term deposits (multiple ADIs)', '$500,000'],
    ['Income (asset-backed)', 'Private credit — Capital SL Premium', '$200,000'],
    ['Growth & income (diversified, liquid)', 'CFS Lakeside MS Balanced (60/40)', '$600,000'],
    ['Tax-effective / education', 'Investment bond', '$150,000'],
    ['Retirement — long-term, tax-advantaged', 'Superannuation (SMSF) — contributions', '$660,000'],
    ['Debt eliminated', 'Car loan repaid', '$90,000'],
    ['Within SMSF — equity + LRBA loan', 'Commercial property (geared)', '≈$1,600,000'],
    ['Within SMSF — LRBA borrowing', 'Limited recourse loan (~65% LVR)', '($1,040,000)'],
    ['Satellite (existing)', 'Cryptocurrency (XRP) — family trust', '$250,000 (held)'],
  ], [34, 46, 20]),
  H2('Concentration & liquidity limits'),
  bullet('Keep at least a substantial cash reserve (target ~$500,000) plus the liquid managed portfolio so you are never a forced seller of growth, property or private-credit assets.'),
  bullet('Keep a cash buffer inside the SMSF to meet expenses, insurance and (later) minimum pension payments — do not let the property leave the fund short of cash.'),
  bullet('Cap cryptocurrency and private credit as satellites; increase private credit only after experience and within your risk profile.'),

  H1('Appendix G — Underlying investments of the CFS Lakeside MS Balanced model'),
  P('Full look-through of the recommended model (60/40) — the 16 underlying wholesale managed funds, target weights, the dollar amount on a $600,000 investment, and each fund’s investment fee (ICR). Weights are targets as at the model date and may change — the model is actively managed. [Confirm current weights and the Investments-version fund codes at implementation.]'),
  table(['Asset class', 'Fund (manager)', 'Weight', '$ on $600k', 'ICR'], [
    ['Cash (5.0%)', 'First Sentier Strategic Cash', '5.0%', '$30,000', '0.20%'],
    ['Aus fixed interest (18.0%)', 'CFS Index Australian Bond', '16.0%', '$96,000', '0.15%'],
    ['', 'Janus Henderson Tactical Income', '2.0%', '$12,000', '0.50%'],
    ['Global fixed interest (17.0%)', 'CFS Index Global Bond', '13.0%', '$78,000', '0.15%'],
    ['', 'Bentham Global Income', '4.0%', '$24,000', '0.74%'],
    ['Aus shares (22.5%)', 'CFS Index Australian Share', '10.0%', '$60,000', '0.16%'],
    ['', 'Schroder Australian Equity', '4.5%', '$27,000', '0.85%'],
    ['', 'Platypus Australian Equities', '4.0%', '$24,000', '0.75%'],
    ['', 'RQI Australian Value', '4.0%', '$24,000', '0.45%'],
    ['Global shares (30.5%)', 'CFS Index Global Share – Hedged', '14.0%', '$84,000', '0.16%'],
    ['', 'RQI Global Value', '7.0%', '$42,000', '0.56%'],
    ['', 'Capital Group New Perspective', '5.5%', '$33,000', '0.80%'],
    ['', 'GQG Partners Global Equity', '2.0%', '$12,000', '0.81%'],
    ['', 'Pendal Global Emerging Market Opp.', '2.0%', '$12,000', '1.42%'],
    ['Property / infra (7.0%)', 'CFS Index Global Property Securities', '4.0%', '$24,000', '0.15%'],
    ['', 'Magellan Infrastructure', '3.0%', '$18,000', '1.11%'],
    ['Total', '16 funds', '100.0%', '$600,000', '≈0.38% wtd'],
  ], [24, 34, 12, 16, 14]),
  P('The ~0.38% weighted investment fee is kept low by the index-core holdings (~57% of the portfolio at 0.15–0.16%), while the active satellites (Magellan, Pendal, Capital Group, GQG, Schroder, Platypus, Bentham, RQI) add diversification at a higher unit cost. Add the 0.75% Lakeside adviser fee and any CFS platform administration to reach the all-in cost (Section 24).', { italics: true, color: GREY }),

  H1('Appendix H — Understanding the strategies (general information)'),
  P('This appendix explains, in plain English, the types of investment and strategy referred to in this advice. It is general information only and does not take into account your objectives, financial situation or needs.'),
  H2('Cash & term deposits'),
  P('Cash held with an Australian ADI is capital-stable and highly liquid, with balances up to $250,000 per person per ADI protected by the Financial Claims Scheme. It provides certainty and immediate access, but a low, fully taxable return, and inflation erodes its real value over time — ideal for your reserve, not for the whole $2.2M.'),
  H2('Private credit / private lending'),
  P('Lending to borrowers outside the banking system, usually secured against property. You earn interest (often monthly) above term-deposit rates, reflecting higher risk. Security is commonly a first registered mortgage; a lower loan-to-value ratio means a larger buffer protecting you. Key risks: capital is not guaranteed, the money is locked in for the loan term, and returns depend on borrowers repaying (and, if not, on the security being sold).'),
  H2('Diversified managed portfolios'),
  P('A managed portfolio pools your money with other investors across many investments and asset classes, professionally selected and rebalanced. Diversification reduces the impact of any single investment doing poorly. Generally liquid, but market-linked and not guaranteed — best for medium-to-long-term investors.'),
  H2('Investment (insurance) bonds'),
  P('A “tax-paid” investment: earnings are taxed inside the bond at up to 30%, and withdrawals are tax-free after 10 years. You can add up to 125% of the previous year’s contribution each year, and nominate beneficiaries. Useful for high earners and long-term goals such as education, and — unlike super — accessible at any time (subject to the tax rules).'),
  H2('Superannuation & contributions'),
  P('Super is a tax-preferred retirement structure: concessional (before-tax) contributions are taxed at just 15% in the fund, and non-concessional (after-tax) contributions are not taxed on the way in (a 3-year bring-forward allows up to $360,000 at once). Earnings are taxed at 15% (0% in pension phase). The trade-off is preservation — generally no access until age 60 and retirement, or 65.'),
  H2('SMSFs & commercial property'),
  P('A self-managed super fund is a fund you run as trustee, giving you control over the investments and the ability to hold direct assets — including commercial property, which retail/industry funds cannot. Property income and gains inside super are taxed at 15% (0% in pension phase). An SMSF can even borrow to buy a single asset through a limited recourse borrowing arrangement, and can hold business premises leased to your own business at arm’s length. The trade-offs are trustee responsibility, cost, and the illiquidity/concentration of a large property inside the fund.'),
  H2('Family trusts & ownership'),
  P('Investments can be held personally, jointly, in a family (discretionary) trust, or in a company. Ownership affects who pays tax, asset protection, and treatment on death. A family trust can stream income to beneficiaries on lower tax rates — valuable where incomes differ — but distributing to children under 18 is penalised, so the benefit comes from streaming to adults. Confirm the right structure with your accountant.'),
  H2('Risk & return'),
  P('Higher potential returns generally carry higher risk, including the risk of losing capital. Spreading wealth across cash (security/liquidity), income assets (private credit), growth assets (a diversified portfolio) and long-term structures (super/property) balances return against risk. The right balance depends on your goals, timeframe and tolerance — captured in your risk profile. No single investment does everything, which is why this advice combines several.'),
  new Paragraph({ spacing: { before: 200 }, children: [run('This appendix contains general information only and does not take into account your objectives, financial situation or needs.', { size: 16, color: GREY, italics: true })] }),

  new Paragraph({ spacing: { before: 240 }, alignment: AlignmentType.CENTER, children: [run('— End of Statement of Advice —', { size: 18, color: GREY })] }),
];

const doc = new Document({
  creator: 'Lakeside Financial',
  title: 'Quenton Gascoigne & Jade Casey - Statement of Advice',
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: [...title, ...body, ...appendix] }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log('Generated:', OUT);
