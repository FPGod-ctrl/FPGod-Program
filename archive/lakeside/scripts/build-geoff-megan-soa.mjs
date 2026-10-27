// Geoff Smith & Megan Caines — couple insurance SOA (personal, super-funded + self-owned).
// Self-designed compliant format (green Lakeside styling), docx library.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../generated-plans/Geoff Smith & Megan Caines - Statement of Advice.docx');

const BRAND = '4C9A2A';
const ACCENT = '2E5A17';
const HDR_FILL = 'CDE3BF';
const GREY = '595959';
const FONT = 'Calibri';

const run = (text, o = {}) => new TextRun({ text, bold: o.bold, italics: o.italics, color: o.color, size: o.size ?? 20, font: FONT, break: o.break });
const P = (text, o = {}) => new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 140, line: 276 }, children: Array.isArray(text) ? text : [run(text, o)] });
const H1 = (text) => new Paragraph({ spacing: { before: 240, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND } }, children: [run(text, { bold: true, size: 26, color: ACCENT })] });
const H2 = (text) => new Paragraph({ spacing: { before: 160, after: 80 }, children: [run(text, { bold: true, size: 22, color: ACCENT })] });
const bullet = (text) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 276 }, children: [run(text)] });

function cell(text, o = {}) {
  const children = Array.isArray(text) ? text
    : [new Paragraph({ spacing: { after: 20, line: 264 }, alignment: o.align, children: [run(text, { bold: o.bold, color: o.color, size: 19 })] })];
  return new TableCell({ children, shading: o.fill ? { fill: o.fill } : undefined, width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined, margins: { top: 40, bottom: 40, left: 80, right: 80 } });
}
function bulletCell(items, width) {
  const paras = items.map((t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 30, line: 264 }, children: [run(t, { size: 19 })] }));
  return new TableCell({ children: paras, width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined, margins: { top: 40, bottom: 40, left: 140, right: 80 } });
}
function table(headers, rows, widths) {
  const b = { style: BorderStyle.SINGLE, size: 2, color: 'BFBFBF' };
  const borders = { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
  const headRow = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { bold: true, fill: HDR_FILL, color: ACCENT, width: widths && widths[i] })) });
  const dataRows = rows.map((r) => new TableRow({ children: r.map((c, i) => Array.isArray(c) ? bulletCell(c, widths && widths[i]) : cell(String(c), { width: widths && widths[i] })) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: [headRow, ...dataRows] });
}
const spacer = (h = 80) => new Paragraph({ spacing: { after: h }, children: [] });

const title = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 60 }, children: [run('STATEMENT OF ADVICE', { bold: true, size: 52, color: BRAND })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1000 }, children: [run('Personal Insurance', { size: 30, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Prepared for', { size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [run('Geoff Smith & Megan Caines', { bold: true, size: 34 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Prepared by', { size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Tristan Biro (FP)', { bold: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Authorised Representative No. 001313019', { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Lakeside Financial Pty Ltd', { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Suite 201, 429 Bay Street, Brighton VIC 3186  ·  03 9596 5111', { size: 18, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [run('Authorised Representative of Pareto Group Pty Ltd  ·  AFSL 418700  ·  ABN 11 155 278 078', { size: 18, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Date of advice: 2 July 2026', { bold: true, size: 22 })] }),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const body = [
  H1('About this Statement of Advice'),
  P('This Statement of Advice (SOA) sets out the personal insurance advice I am providing to you, Geoff Smith and Megan Caines, and my reasons for it. It is an important document — please read it carefully before deciding whether to act on my advice.'),
  P('Geoff, you are an existing client of Lakeside Financial; Megan, you are a new client. I last spoke with you on 28 June 2026 to review your Risk Management Program. It has been a number of years since Geoff’s insurance was reviewed, and there have been significant changes to your financial situation and family circumstances.'),
  P('The purpose of this advice is to review your existing insurance, ensure your cover remains appropriate, obtain better value where possible, and ensure you retain a comprehensive level of cover to protect your family. This SOA should be read together with the Financial Services Guide (FSG), my Adviser Profile, and the PDS and Target Market Determination (TMD) for each product referred to. It is limited to the scope in Section 1 and is valid for 30 days.'),

  H1('1. Scope of my advice'),
  P('Based on our discussions, the scope of this advice is your personal (risk) insurance for both of you:'),
  table(['Protection need', 'Geoff', 'Megan'], [
    ['Income Protection', 'IN SCOPE', 'IN SCOPE'],
    ['Life (Death) cover', 'IN SCOPE', 'IN SCOPE'],
    ['Total & Permanent Disability (TPD)', 'IN SCOPE', 'IN SCOPE'],
    ['Trauma / Critical Illness', 'OUT — you have elected not to take Trauma cover (see Section 6)', 'OUT — not proceeding'],
  ], [46, 27, 27]),
  P('This advice does not address superannuation adequacy, investments, retirement planning, debt or estate planning, other than as they relate to the insurance advice above. You may have other needs this SOA does not cover.', { italics: true, color: GREY }),

  H1('2. About you'),
  table(['Detail', 'Geoff Smith', 'Megan Caines'], [
    ['Date of birth', '05/07/1979 (age 46)', '08/01/1986 (age 40)'],
    ['Marital status', 'Married', 'Married'],
    ['Residential address', '1 Regina Court, Eltham VIC 3095', '1 Regina Court, Eltham VIC 3095'],
    ['Occupation', 'Barrister (sole trader, self-employed)', 'Solicitor (partner / PAYG, Polaris Lawyers)'],
    ['Annual income', '$350,000', '$200,000 personal exertion (≈$250,000 gross incl. partnership distributions)'],
    ['Super contributions', 'Nil this financial year', '≈$24,000 p.a. (≈12%)'],
    ['Smoker', 'Non-smoker (9 yrs)', 'Non-smoker (7 yrs)'],
    ['Estate planning', 'Will (with testamentary trust) & POA in place — being updated', 'No Will yet — joint estate planning underway'],
  ], [22, 39, 39]),
  P('You have four children — Theodore (19), Ella (14), Hudson (6) and Grace (3).'),
  H2('Your financial position (summary)'),
  table(['Assets', 'Value', 'Liabilities', 'Balance'], [
    ['Family home — Eltham (joint)', '$1,600,000', 'Home loan (Westpac)', '$1,452,000'],
    ['Investment property — Epping (Geoff)', '$700,000', 'Investment loan (Westpac)', '$314,000'],
    ['Investment property — Carnegie (Meg)', '$450,000', 'Investment loan (ANZ)', '$264,000'],
    ['Business', '$600,000', 'Business debt', '$39,000'],
    ['Cash', '$120,000', 'Credit card', '$16,000'],
    ['Home contents', '$100,000', '', ''],
    ['Superannuation — Geoff / Megan', '$215,000 / $270,000', '', ''],
    ['Total assets', '$4,055,000', 'Total debts', '$2,085,000'],
  ], [38, 18, 30, 14]),
  new Paragraph({ spacing: { before: 100, after: 140 }, children: [run('Total net worth: approximately $1,970,000', { bold: true, size: 22, color: ACCENT })] }),

  H1('3. Your goals & objectives'),
  P('Your short-term goals are to continue working and pay down debt, invest further in the business, undertake home/property upgrades, fund your children’s schooling, and travel regularly. Longer term you would like a beach property and adequate retirement funds.'),
  H2('Insurance objectives'),
  bullet('To protect your family against your substantial debt (approximately $2.085m) and to provide for your four children — including their education — in the event of the death, total and permanent disablement, or extended incapacity of either of you.'),
  bullet('To ensure Geoff’s income is adequately protected — his existing Income Protection is well below an appropriate level relative to his current income.'),
  bullet('To provide Megan with appropriate personal insurance (she currently holds none).'),
  bullet('To obtain comprehensive, good-value cover, structured cost-effectively.'),
  bullet('In the event of a death, to ensure the surviving partner has the financial freedom to reduce work and care for the children.'),

  H1('4. Your existing insurance'),
  P('Geoff currently holds the following cover (Megan currently holds no personal insurance):'),
  table(['Cover', 'Insurer', 'Sum insured', 'Owner', 'Premium (p.a.)', 'Action'], [
    ['Income Protection', 'PPS (121009803)', '$8,032/mo (Agreed value; 90-day wait; to 65)', 'Self (tax-deductible)', '$3,686.52', 'Increase'],
    ['Life', 'AIA (super)', '$2,493,727', 'Super', '$2,028.01 (Life + TPD)', 'Cancel'],
    ['TPD (Any)', 'AIA (super)', '$623,431', 'Super', '(incl. above)', 'Cancel'],
    ['Trauma', 'AIA', '$187,029', 'Self-owned', '$1,294.82', 'Cancel*'],
  ], [18, 16, 26, 16, 16, 8]),
  P('* See the important note in Section 10 before cancelling the AIA Trauma cover.', { italics: true, color: GREY }),

  H1('5. My recommendations'),
  P('In summary, I recommend that you:'),
  bullet('Increase Geoff’s existing PPS Income Protection benefit to $20,833 per month; and take out new Income Protection for Megan of $11,666 per month;'),
  bullet('Replace Geoff’s AIA Life & TPD (in super) with new Acenda Life $3,000,000 and TPD $2,000,000 (in super); and take out new TAL Life $4,000,000 and TPD $2,000,000 (in super) for Megan;'),
  bullet('Cancel Geoff’s AIA Life, TPD and Trauma cover (Trauma at your election — see Sections 6 and 10); and'),
  bullet('Do not cancel any existing cover until the replacement cover has been accepted and is in force.'),
  spacer(),
  H2('Recommended cover — Geoff'),
  table(['Cover', 'Insurer / structure', 'Sum insured', 'Owner / funded by', 'Premium p.a.', 'Status'], [
    ['Income Protection', 'PPS Professionals Choice (existing 121009803)', '$20,833/mo — Agreed value, 90-day wait, to age 65, increasing claim', 'Self-owned — cash flow (tax-deductible)', '$9,764.04', 'Increase'],
    ['Life', 'Acenda (Nippon Life) — inside super', '$3,000,000', 'Super — rollover', '$2,513.90 (Life + TPD)', 'Replace AIA'],
    ['TPD (Any occupation)', 'Acenda — inside super', '$2,000,000', 'Super — rollover', '(incl. above)', 'Replace AIA'],
  ], [16, 24, 26, 18, 10, 6]),
  P('Geoff — total recommended premium: $12,277.94 p.a.', { color: GREY }),
  H2('Recommended cover — Megan (all new)'),
  table(['Cover', 'Insurer / structure', 'Sum insured', 'Owner / funded by', 'Premium p.a.', 'Status'], [
    ['Income Protection', 'TAL Accelerated Protection', '$11,666/mo — Indemnity, 90-day (13-wk) wait, to age 65, increasing claim', 'Self-owned — cash flow (tax-deductible)', '$2,094.00', 'New'],
    ['Life', 'TAL — inside super (TAL Super)', '$4,000,000', 'Super — rollover', '$1,798.17 (Life + TPD)', 'New'],
    ['TPD (Any occupation)', 'TAL — inside super', '$2,000,000', 'Super — rollover', '(incl. above)', 'New'],
  ], [16, 24, 26, 18, 10, 6]),
  P('Megan — total recommended premium: $3,892.17 p.a.', { color: GREY }),
  spacer(),
  P([run('Total recommended premium (both): ', { bold: true }), run('$16,170.11 p.a.', { bold: true, color: ACCENT })]),

  H1('6. Why my advice is appropriate'),
  H2('Income Protection'),
  P('Geoff — increase to $20,833 per month. Your existing benefit of $8,032 per month is well below an appropriate level for your income and would not meet your mortgage and living expenses if you were unable to work. I recommend increasing the benefit to $20,833 per month — approximately 75% of your income, being the maximum the insurer will offer. I recommend retaining your existing PPS policy and simply increasing it, because it is a legacy "Agreed Value" contract: the benefit is agreed up front and is not re-assessed against your income at claim time. This is superior to new policies (only "Indemnity" cover is available on new contracts since October 2021) and is particularly valuable given your lumpy barrister income. A 90-day waiting period is appropriate as you can fund that period from Megan’s continuing income and your $120,000 cash reserve.'),
  P('Megan — new cover of $11,666 per month. You currently have no income protection. I recommend a benefit of $11,666 per month — approximately 70% of your $200,000 personal-exertion income (your partnership distributions are not personal exertion and are not insured under an income protection policy). As this is new cover, it is an Indemnity contract (income assessed at claim), with a 90-day wait and benefits to age 65.'),
  H2('Life Cover'),
  P('Geoff — $3,000,000. This is the amount required in the event of your death to:'),
  bullet('Extinguish your home loan of approximately $1,452,000;'),
  bullet('Extinguish your investment property debt of approximately $578,000; and'),
  bullet('Provide surplus proceeds of approximately $1,000,000 to allow Megan to reduce her work commitments and care for your children.'),
  P('Megan — $4,000,000. This is the amount required in the event of your death to:'),
  bullet('Extinguish the home loan of approximately $1,452,000;'),
  bullet('Extinguish the investment property debt of approximately $578,000; and'),
  bullet('Provide surplus proceeds of approximately $2,000,000 to allow Geoff to reduce his work commitments and care for your children.'),
  H2('Total & Permanent Disability (TPD) — $2,000,000 each'),
  P('TPD cover of $2,000,000 for each of you is recommended to extinguish your home loan (≈$1,452,000) and assist with your investment property debt (≈$578,000) in the event that either of you becomes totally and permanently disabled and unable to work again. I have recommended the "Any occupation" TPD definition because your Life and TPD cover is being held inside superannuation, and the "any occupation" definition is required for a TPD benefit to satisfy the superannuation permanent-incapacity condition of release.'),
  H2('Trauma / Critical Illness — discussed and not proceeding'),
  P('We discussed Trauma (Critical Illness) cover in detail. I explained its value — the benefit is paid on diagnosis of a specified condition regardless of your ability to work, with around 85% of claims relating to cancer, stroke and heart attack (and around 1 in 5 men diagnosed with prostate cancer in their lifetime). Having weighed the premium cost against your other cover and your cash-flow position, you have elected not to take Trauma cover, and to cancel Geoff’s existing AIA Trauma policy. You should understand that, without Trauma cover, you will not receive a lump sum on diagnosis of a serious illness that does not render you totally disabled. This is your decision, and I have noted the important point in Section 10 before cancelling the existing AIA Trauma policy.'),
  H2('Holding Life & TPD inside superannuation'),
  P('I recommend your Life and TPD cover be held inside superannuation and funded by rollover. This keeps the premiums off your personal cash flow, and can be tax-effective. You should be aware that funding premiums from super reduces your retirement balances over time, particularly where contributions are limited (Geoff has made no personal super contributions this financial year). Because the cover is held in super and Geoff has a former spouse, it is essential that each of you completes a valid binding death benefit nomination with the fund so the proceeds are directed to each other and your children — see Section 12.'),
  H2('Product selection'),
  P('Geoff — Life & TPD: I recommend Acenda (Nippon Life) in place of your existing AIA cover. Under our research (Xplan Risk Researcher) Acenda scores ahead of AIA (core 83% vs 81%, supplementary 67% vs 43%) and provides features AIA does not — including a TPD Severity option, TPD "long term care" cover, a Business Safeguard option, a premium waiver on disability, a 14-day Life buy-back after a TPD claim, and access to Vivo Virtual Care (AIA withdrew its Medix service in 2022). Acenda also applies a 7.5% ongoing premium discount and provides more cover at a competitive premium. In moving from AIA you will lose access to the AIA Vitality rewards program (including its $500 Silver Status reward), which I have discussed with you.'),
  P('Geoff — Income Protection: I recommend retaining and increasing your existing PPS Professionals Choice policy rather than replacing it, to preserve your valuable legacy Agreed Value definition and PPS’s profit-share features.'),
  P('Megan — Life, TPD & Income Protection: I recommend TAL Accelerated Protection. TAL offers competitive premiums with a Health Sense discount, an appropriate "any occupation" TPD definition for cover held in super, and a 15% TAL Super rebate where premiums are paid annually by rollover.'),
  H2('Premium structure'),
  P('I have recommended stepped (variable age-stepped) premiums across all cover. Stepped premiums are lower initially, keeping the up-front cost down. You should be aware that stepped premiums increase each year with age and can become significantly more expensive over time; we will review this — and your overall cover and affordability — at each annual review.'),

  H1('7. Replacing your existing cover'),
  P('My advice involves replacing Geoff’s AIA Life & TPD cover with new Acenda cover (both inside super). Geoff’s Income Protection is being increased under his existing PPS policy (not replaced), and Megan’s cover is all new. Do not cancel your AIA Life & TPD cover until your new Acenda cover has been accepted and is in force. The table below summarises the replacement.'),
  table(['', 'Terminating — AIA (super)', 'New — Acenda (super)'], [
    ['Cover', 'Life $2,493,727; TPD (Any) $623,431', 'Life $3,000,000; TPD (Any) $2,000,000'],
    ['Owner / structure', 'Inside super', 'Inside super (rollover)'],
    ['Premium (p.a.)', '$2,028.01', '$2,513.90 (for materially higher cover)'],
    ['Benefits gained', '—', ['Higher research score (83/67 vs 81/43)', 'Materially higher Life ($3m) and TPD ($2m) cover', 'TPD Severity option and TPD long-term care', 'Business Safeguard; premium waiver on disability', '14-day Life buy-back after TPD; Vivo Virtual Care; 7.5% discount']],
    ['Benefits lost', ['AIA Vitality rewards program (incl. $500 Silver Status reward)', 'AIA’s Future Insurability (business) rated marginally higher'], '—'],
    ['Reasons we recommend the replacement', ['Comparable/better research score with additional features (above)', 'Significantly more cover appropriate to your needs', 'Competitive premium and a 7.5% ongoing discount; access to Vivo'], ''],
  ], [18, 41, 41]),
  P('Risks of replacement: the new Acenda cover is subject to fresh underwriting and a new 13-month suicide exclusion; loadings or exclusions may apply based on your health; and you must not cancel the AIA cover until the Acenda cover is in force. Geoff’s AIA Trauma cover is being cancelled at your election — see the important note in Section 10.', { italics: true, color: GREY }),

  H1('8. Cost & affordability'),
  P('The total recommended premium is $16,170.11 per annum, structured deliberately to minimise the impact on your cash flow:'),
  table(['Cover', 'Funded by', 'Premium p.a.'], [
    ['Geoff — Life & TPD', 'Superannuation rollover (net ≈$2,136.81 after $377.09 rebate)', '$2,513.90'],
    ['Megan — Life & TPD', 'Superannuation rollover (net ≈$1,528.44 after $269.73 rebate)', '$1,798.17'],
    ['Geoff — Income Protection', 'Personal cash flow — tax-deductible', '$9,764.04'],
    ['Megan — Income Protection', 'Personal cash flow — tax-deductible', '$2,094.00'],
    ['Total', '', '$16,170.11'],
  ], [34, 44, 22]),
  P('Your Life and TPD premiums ($4,312.07 p.a.) are funded from superannuation by rollover, so they do not draw on your personal income (though they will reduce your retirement balances over time). The Income Protection premiums ($11,858.04 p.a.) are personally funded but are tax-deductible, which materially reduces their effective cost given your marginal tax rates.'),
  P('Structuring the majority of your premiums through superannuation, and taking advantage of the tax-deductibility of Income Protection, keeps the recommended cover as cost-effective as possible. You should nonetheless satisfy yourself that the ongoing premiums remain affordable — particularly as stepped premiums rise with age — and I recommend we review your cover and its affordability at each annual review. If premiums are not maintained, your cover will lapse.'),

  H1('9. Fees & commissions'),
  P('I do not charge you a fee for this advice. Product providers pay commission to Pareto Group Pty Ltd, from which I may receive a share. Commissions are not an additional cost to you. The commission on the recommended cover (GST inclusive) is:'),
  table(['Policy', 'Basis', 'Year 1', 'Ongoing p.a.'], [
    ['Megan — TAL (Life, TPD & IP)', 'Per TAL commission schedule', '$2,236.08', '$853.41'],
    ['Geoff — Acenda (Life & TPD)', '66% upfront / 22% ongoing on $2,513.90', '$1,659.17', '$553.06'],
    ['Geoff — PPS IP increase', '66% upfront / 22% ongoing on the $6,077.52 premium increase', '$4,011.16', '$1,337.05'],
  ], [40, 30, 15, 15]),
  P('I am an Authorised Representative of Pareto Group Pty Ltd and may receive up to 50% of the commissions Pareto receives. Renewal commission continues for the life of the policies.', { color: GREY, italics: true }),

  H1('10. Important information & risks'),
  bullet('Do NOT cancel Geoff’s existing AIA Trauma cover until you have confirmed there is no current or potential claim under it. Cancelling the policy first may forfeit your ability to claim.'),
  bullet('Do not cancel any AIA Life or TPD cover until the new Acenda cover has been accepted and is in force, to avoid a gap in cover.'),
  bullet('Acceptance of new/increased cover is subject to underwriting; premiums may be varied and loadings or exclusions applied based on your health, pastimes or occupation.'),
  bullet('Premiums are stepped and will increase with age; if premiums are not paid, your cover will lapse. Affordability should be reviewed at each annual review.'),
  bullet('Funding Life and TPD premiums through superannuation will reduce your retirement savings, particularly where contributions are limited.'),
  bullet('For cover held inside superannuation, a benefit is generally only released once a condition of release is met (e.g. death, or the trustee’s determination of permanent incapacity).'),
  bullet('If you take less cover than recommended (for example, by not taking Trauma cover), you may not be fully protected.'),

  H1('11. Your duty of disclosure'),
  P('Before entering into a life insurance contract, each of you has a duty under the Insurance Contracts Act 1984 (Cth) to take reasonable care not to make a misrepresentation to the insurer — answering the insurer’s questions honestly, accurately and completely. Your duty continues until the insurer confirms cover in writing; if your health or circumstances change before then, you must tell the insurer. If you do not meet this duty, the insurer may reduce or decline a claim, or cancel the policy. Where cover is applied for through superannuation, this duty is owed to the trustee.'),

  H1('12. Other things you should know'),
  bullet('Approved Product List: I can only recommend products on Pareto Group’s Approved Product List.'),
  bullet('Cooling off: you generally have a cooling-off period to cancel a new policy — see the PDS.'),
  bullet('Advice expiry: this advice is valid for 30 days from the date of this SOA.'),
  bullet('Binding nominations (important): as your Life and TPD cover is held inside superannuation, and given Geoff’s blended-family circumstances (including a former spouse), it is essential that each of you completes and maintains a valid binding death benefit nomination with your fund, directing the proceeds to each other and/or your children. Without this, the trustee has discretion over who receives the benefit.'),
  bullet('Estate planning: Geoff holds a Will (with a testamentary trust) which is being updated with your estate planners; Megan does not yet hold a Will. I recommend Megan establish a Will and Powers of Attorney, and that you finalise your estate planning so that your assets and insurance proceeds pass as you intend. Estate planning and legal work are outside the scope of this SOA.'),
  bullet('Superannuation / retirement: I have not provided superannuation adequacy or retirement advice in this SOA; funding cover via super will reduce your balances over time.'),

  H1('13. Authority to proceed'),
  P('By signing below, we confirm that we have received and read this Statement of Advice, the FSG and the relevant PDS(s); that the information about us is correct; and that we authorise Tristan Biro / Lakeside Financial to proceed with the advice set out above.'),
  spacer(140),
  table(['Client', 'Signature', 'Date'], [['Geoff Smith', '', ''], ['Megan Caines', '', '']], [40, 40, 20]),
  spacer(200),
  new Paragraph({ children: [run('Adviser: Tristan Biro (FP) — Authorised Representative No. 001313019', { size: 20 })] }),
  new Paragraph({ children: [run('Signature: __________________________     Date: ______________', { size: 20 })] }),
  new Paragraph({ spacing: { before: 200 }, children: [run('Lakeside Financial Pty Ltd — Authorised Representative of Pareto Group Pty Ltd — AFSL 418700 — ABN 11 155 278 078', { size: 16, color: GREY })] }),
  new Paragraph({ children: [run('General advice warning: parts of this document contain general information only. Before acting you should consider its appropriateness having regard to your objectives, financial situation and needs.', { size: 16, color: GREY, italics: true })] }),
];

const appendix = [
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('APPENDIX TO STATEMENT OF ADVICE', { bold: true, size: 24, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run('Prepared by Tristan Biro (FP) — Authorised Representative No. 001313019', { size: 18, color: GREY })] }),
  H1('Personal Insurance'),
  P('Financial planning is about protecting your wealth as well as building it. It is easy to assume we won’t get sick or hurt and to overlook the need to protect the very thing that generates our wealth — our health and our ability to work. But if an accident or serious illness does occur, the impact can be devastating.'),
  P('No matter how well you manage your finances, there is always a risk of early death, serious illness or injury. Where that leaves you and your family depends on the protection strategy you have in place.'),
  H2('Life Insurance'),
  P('Life insurance pays a lump sum on death, or in some cases terminal illness. It can be used to pay off debts, provide an income for dependants, cover final expenses, and provide a capital buffer so a surviving partner has financial choices.'),
  H2('Total and Permanent Disability (TPD) Insurance'),
  P('TPD insurance pays a lump sum if you become permanently unable to work, unable to care for yourself, or suffer significant permanent cognitive impairment. "Any Occupation" TPD (required for cover held inside super) pays if you are unlikely to ever work in any occupation suited to your education, training or experience; "Own Occupation" is a more generous definition but is not available inside super.'),
  H2('Trauma (Critical Illness) Insurance'),
  P('Trauma insurance pays a lump sum on diagnosis of a specified illness or injury such as cancer, heart attack or stroke, regardless of whether you can return to work. Around 85% of claims relate to cancer, stroke and heart attack.'),
  H2('Income Protection Insurance'),
  P('Income Protection replaces up to around 70–75% of your income if you are unable to work due to sickness or injury, after a waiting period and up to a benefit period (e.g. to age 65). Key features include:'),
  bullet('Waiting period — the time off work before a benefit is payable (e.g. 90 days). A longer wait generally means a lower premium.'),
  bullet('Agreed Value vs Indemnity — Agreed Value fixes the benefit at application (only available on older/legacy policies); Indemnity assesses income at the time of claim (the only option on new policies since October 2021).'),
  P('Income Protection premiums are generally tax-deductible, but benefit payments are assessable income.'),
  H2('Ownership — inside vs outside superannuation'),
  P('Life, TPD and Income Protection can be held personally or inside superannuation. Holding cover inside super reduces the impact on personal cash flow (premiums are funded from your super balance/rollover) and can be tax-effective, but it reduces your retirement savings, may offer fewer features, and a benefit can only be released once a superannuation condition of release is met. For cover inside super, a binding death benefit nomination directs who receives a death benefit.'),
  H2('Premiums'),
  bullet('Stepped premiums increase each year with age — lower initially but more expensive over time.'),
  bullet('Level premiums are fixed (except CPI) — higher initially but more stable over time.'),
  H2('Application and Underwriting'),
  P('When applying you will provide personal and medical information so the underwriter can assess the application; medical evidence may be required. Depending on your health, a loading or exclusion may apply. Cover is generally guaranteed renewable while premiums are paid. If premiums stop, cover lapses.'),
  new Paragraph({ spacing: { before: 200 }, children: [run('This appendix contains general information only and does not take into account your objectives, financial situation or needs.', { size: 16, color: GREY, italics: true })] }),
];

const doc = new Document({
  creator: 'Lakeside Financial',
  title: 'Geoff Smith & Megan Caines - Statement of Advice',
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: [...title, ...body, ...appendix] }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log('Generated:', OUT);
