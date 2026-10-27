// Steven Banbury insurance-only SOA — business + personal cover.
// Self-designed compliant format (green Lakeside styling), docx library.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../generated-plans/Steven Banbury - Statement of Advice.docx');

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

// ---- title page ----
const title = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 60 }, children: [run('STATEMENT OF ADVICE', { bold: true, size: 52, color: BRAND })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1000 }, children: [run('Personal & Business Insurance', { size: 28, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Prepared for', { size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [run('Steven Banbury', { bold: true, size: 36 })] }),
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
  P('This Statement of Advice (SOA) sets out the personal and business insurance advice I am providing to you, Steven Banbury, and my reasons for it. It is an important document — please read it carefully before deciding whether to act on my advice.'),
  P('This SOA should be read together with the Financial Services Guide (FSG), my Adviser Profile, and the Product Disclosure Statement (PDS) and Target Market Determination (TMD) for each product referred to. My advice is limited to the scope set out in Section 1 and does not consider any needs outside that scope.'),
  P('My advice is based on the information you have provided. If any of the information recorded in this document is incorrect or incomplete, please let me know, as my advice may not be appropriate. This advice is valid for 30 days from the date shown above.'),

  H1('1. Scope of my advice'),
  P('You have asked me to review your personal (risk) insurance and the business insurance connected to your interest in Engineering Solutions Tasmania. Based on our discussions, the scope of this advice is:'),
  table(['Protection need', 'In / Out of scope'], [
    ['Life (Death) cover — personal & business', 'IN SCOPE'],
    ['Total & Permanent Disability (TPD, Own occupation) — personal & business', 'IN SCOPE'],
    ['Trauma / Critical Illness cover — personal & key person', 'IN SCOPE'],
    ['Income Protection', 'OUT of scope'],
  ], [58, 42]),
  P('This advice does not address superannuation, investments, retirement planning, taxation structuring or estate planning, other than as they relate to the insurance advice above. Your business partner’s own insurance is dealt with separately and does not form part of this advice. You may have other needs this SOA does not cover.', { italics: true, color: GREY }),

  H1('2. About you'),
  P('You are a self-employed engineer and business owner (Engineering Solutions Tasmania), married, with two financially independent adult children (Emma, 27 and James, 25). Your home is effectively debt-free (a line of credit facility is held but is essentially undrawn), and you hold a current Will incorporating a testamentary trust, and Powers of Attorney.'),
  H2('Your details'),
  table(['Detail', 'Your information'], [
    ['Full name', 'Steven Banbury'],
    ['Date of birth', '18/12/1969 (age 56)'],
    ['Residential address', '8 Richards Avenue, East Launceston TAS 7250'],
    ['Contact', '0407 349 033  ·  steven@estas.com.au'],
    ['Marital status', 'Married'],
    ['Occupation / employment', 'Engineer — self-employed business owner, Engineering Solutions Tasmania'],
    ['Occupation class', 'AAA / Own Occupation (non-manual professional)'],
    ['Annual income', '$300,000 (excl. super); $336,000 incl. employer super'],
    ['Monthly cash surplus', '$6,000'],
    ['Super contributions', '$30,000 p.a.'],
    ['Smoker status', 'Non-smoker'],
    ['Dependants', 'Emma (27) and James (25) — financially independent'],
    ['Estate planning', 'Will (with testamentary trust) and Powers of Attorney in place'],
  ], [28, 72]),
  H2('Your financial position (summary)'),
  table(['Assets', 'Value', 'Liabilities', 'Balance'], [
    ['Family home (Launceston)', '$1,200,000', 'Home loan / LOC', '$150 (of $250,000 limit)'],
    ['Business — Engineering Solutions Tas.', '$800,000', '', ''],
    ['Cash', '$150,000', '', ''],
    ['SMSF (property $750k + cash $50k)', '$800,000', '', ''],
    ['Total assets', '$2,950,000', 'Total debts', '~$150'],
  ], [40, 18, 27, 15]),
  new Paragraph({ spacing: { before: 100, after: 140 }, children: [run('Total net worth: approximately $2,949,850', { bold: true, size: 22, color: ACCENT })] }),

  H1('3. Your goals & objectives'),
  P('Your objectives for this advice reflect both your personal circumstances and your role as a business owner.'),
  H2('Personal objectives'),
  P('To ensure your spouse & family would be financially secure — with a lump sum equivalent to approximately two years of household income, plus a buffer to meet medical, recovery and lifestyle costs — in the event of your death, total and permanent disability, or a serious traumatic illness. As your children are financially independent and your home is effectively debt-free, this cover is focused on income replacement and providing additional wealth and security for your spouse & family, rather than clearing debt.'),
  H2('Business objectives'),
  bullet('Key person protection: to protect Engineering Solutions Tasmania against the financial impact of losing you as a key person — providing the business with funds to manage a downturn in revenue and the cost of recruiting or replacing you.'),
  bullet('Business succession (buy/sell): to ensure that, on your death or total and permanent disability, your share of the business can be purchased by your business partner (Andrew Blackberry) — providing your estate & family with fair value for your interest, and giving the business certainty and continuity.'),
  H2('Cost-effectiveness'),
  P('To hold appropriate cover at a competitive premium, and to address the scheduled premium increases on your existing policies.'),

  H1('4. Your existing insurance'),
  P('You currently hold two MetLife business policies (both stepped premium), with you as the life insured:'),
  table(['Policy', 'Cover', 'Sum insured', 'Owner', 'Premium (p.a.)', 'Action'], [
    ['Keyman (PN20000057027)', 'Life / TPD (Own) / Trauma', '$221,340 each', 'Engineering Solutions Tasmania', '$4,418.76', 'Replace'],
    ['Buy/Sell (PN20000057028)', 'Life / TPD (Own)', '$885,360 each', 'Steven Banbury (self-owned)', '$5,486.16', 'Replace'],
  ], [22, 20, 16, 22, 12, 8]),
  P('Your current combined premium for this cover is $9,904.92 per annum. Your business partner, Andrew Blackberry, holds his own mirror cover (with TAL); that cover is his own and is not part of this advice.'),

  H1('5. My recommendations'),
  P('I recommend that you:'),
  bullet('Establish a new personal Acenda policy (Life, Trauma and TPD) to provide personal & family protection — this is new cover;'),
  bullet('Replace your existing MetLife Key Person cover with an equivalent Acenda policy owned by Engineering Solutions Tasmania; and'),
  bullet('Replace your existing MetLife Buy/Sell cover with an equivalent Acenda policy, self-owned.'),
  bullet('Do not cancel your existing MetLife cover until the new Acenda policies have been accepted and are in force.'),
  spacer(),
  H2('a) Personal protection (NEW cover) — self-owned'),
  table(['Cover', 'Sum insured', 'Premium type'], [
    ['Life Cover', '$600,000', 'Stepped'],
    ['Trauma (Critical Illness Plus)', '$600,000', 'Stepped'],
    ['TPD (Own occupation)', '$600,000', 'Stepped'],
  ], [50, 25, 25]),
  P('Acenda (Nippon Life) — new policy. Premium: $849.62 per month ($10,195.44 p.a.).', { color: GREY }),
  H2('b) Key person (Keyman) — owned by Engineering Solutions Tasmania (replaces MetLife)'),
  table(['Cover', 'Sum insured', 'Premium type'], [
    ['Life Cover', '$221,340', 'Stepped'],
    ['TPD (Own occupation)', '$221,340', 'Stepped'],
    ['Trauma (Critical Illness Plus)', '$221,340', 'Stepped'],
  ], [50, 25, 25]),
  P('Acenda (Nippon Life) — new policy replacing MetLife PN20000057027. Premium: $313.42 per month ($3,761.04 p.a.).', { color: GREY }),
  H2('c) Buy/Sell (business succession) — self-owned (replaces MetLife)'),
  table(['Cover', 'Sum insured', 'Premium type'], [
    ['Life Cover', '$885,360', 'Stepped'],
    ['TPD (Own occupation)', '$885,360', 'Stepped'],
  ], [50, 25, 25]),
  P('Acenda (Nippon Life) — new policy replacing MetLife PN20000057028. Premium: $425.02 per month ($5,100.24 p.a.).', { color: GREY }),
  spacer(),
  P([run('Total recommended premium: ', { bold: true }), run('$1,588.06 per month ($19,056.72 p.a.).', { bold: true, color: ACCENT })]),

  H1('6. Why my advice is appropriate'),
  H2('a) Personal protection — $600,000 Life, Trauma and TPD'),
  P('You have chosen to maintain a personal sum insured of $600,000, which you consider represents approximately two years of household income — providing your spouse & family with income replacement and breathing room to adjust in the event of your death, total and permanent disablement, or a serious traumatic illness. As your children are financially independent and your home is effectively debt-free, the cover is focused on this income-replacement buffer, on providing additional wealth and security for your spouse & family, and on funding the significant costs a serious illness or injury can bring, rather than on clearing debt.'),
  P('I have recommended Trauma (Critical Illness) cover because a serious illness such as cancer, heart attack or stroke can create substantial out-of-pocket costs and a period out of work even where it is not permanently disabling. TPD (Own Occupation) is recommended because, as a specialist professional, an Own Occupation definition provides the most appropriate protection for your circumstances.'),
  H2('b) Key person (Keyman) — $221,340, owned by the business'),
  P('As a key person in Engineering Solutions Tasmania, your death, disablement or serious illness would have a material financial impact on the business. This cover — owned by, and with proceeds payable to, the business — provides funds to help manage a downturn in revenue and the cost of recruiting or replacing you. The sum insured is maintained at the existing level of $221,340, reflecting the agreed key-person value; the premium is met by the business.'),
  H2('c) Buy/Sell (business succession) — $885,360, self-owned'),
  P('You and your business partner, Andrew Blackberry, have a buy/sell arrangement. This cover ensures that, on your death or total and permanent disablement, the funds are available for your interest in the business to be acquired by the surviving owner — providing your estate & family with fair value for your share, and giving the business certainty and continuity. The sum insured is maintained at the existing $885,360, reflecting the agreed value of your business interest under that arrangement, and the policy is self-owned consistent with your buy/sell structure. Andrew holds mirror cover on his own life.'),
  H2('Premium structure and product selection'),
  P('I have recommended stepped premiums across all cover. Given the ongoing, indefinite nature of your business (key person and buy/sell) needs, stepped premiums keep the initial cost efficient; we will review the structure at each annual review as your circumstances and the business change.'),
  P('I have recommended Acenda (Nippon Life, formerly MLC) as the insurer for all cover. Against your existing MetLife cover and an alternative from TAL, Acenda scored strongly on our research (Xplan Risk Researcher): for your Buy/Sell (Life & TPD) Acenda matches MetLife on core score (100) with a higher supplementary score (76 vs 67); for your Life/TPD/Trauma cover Acenda scores 99 core / 88 supplementary, ahead of TAL (92–93 core / 78 supplementary) and comparable to MetLife. Acenda also delivers a materially lower premium on the replaced business cover (a saving of $1,043.64 p.a.), a 7.5% ongoing (Vivo) premium discount, and additional features relevant to you — including a premium waiver after three months’ disablement (vs six months with MetLife), Premium Freeze / Economiser, a TPD Severity option, TPD “long term care” cover renewable to age 100, a Terminal Illness Support booster, and access to Vivo Virtual Care. Holding all cover with one insurer also simplifies administration.'),

  H1('7. Replacing your existing cover'),
  P('My advice involves replacing your two existing MetLife business policies with equivalent Acenda policies. Your new personal Acenda policy is additional new cover, not a replacement. You should not cancel your existing MetLife cover until your new Acenda cover is accepted and in force. The table below summarises the replacement.'),
  table(['', 'Terminating — MetLife', 'New — Acenda'], [
    ['Policies', 'Keyman (PN20000057027) + Buy/Sell (PN20000057028)', 'Keyman + Buy/Sell (new policies)'],
    ['Cover', 'Life / TPD (Own) / Trauma (Keyman); Life / TPD (Own) (Buy/Sell)', 'Same covers and sums insured'],
    ['Sums insured', 'Keyman $221,340; Buy/Sell $885,360', 'Keyman $221,340; Buy/Sell $885,360'],
    ['Owners', 'Engineering Solutions Tasmania (Keyman); Steven self-owned (Buy/Sell)', 'Unchanged'],
    ['Premium (p.a.)', '$9,904.92', '$8,861.28 (saving $1,043.64 p.a.)'],
    ['Benefits gained', '—', ['Premium waiver after 3 months’ disablement (vs 6)', 'Premium Freeze / Economiser (Life, TPD & Trauma)', 'TPD Severity option; TPD cover renewable to age 100', 'Terminal Illness Support booster; broader trauma definitions', 'Vivo Virtual Care; higher supplementary research score']],
    ['Benefits lost', ['Grief Counselling & Involuntary Unemployment benefits', 'Trauma reinstatement paying 100% for a subsequent primary cancer (Acenda pays a partial benefit)', 'TPD “Activities of Daily Living” as an alternate assessment tier', 'Some trauma conditions (e.g. occupationally-acquired Hepatitis B/C, severe inflammatory bowel disease)'], '—'],
    ['Reasons we recommend the replacement', ['Comparable or better research score with additional features (above)', 'Materially lower premium — $1,043.64 p.a. saving on the business cover', 'Consolidates with your new personal cover under one insurer'], ''],
  ], [18, 41, 41]),
  P('Risks of replacement you should be aware of: new policies are subject to fresh underwriting and a new 13-month suicide exclusion (and trauma/TPD qualifying periods); you may be subject to loadings or exclusions based on your current health; and you should not cancel your MetLife cover until the Acenda cover is accepted and in force.', { italics: true, color: GREY }),

  H1('8. What it costs (premium & affordability)'),
  P('The total recommended premium is $1,588.06 per month ($19,056.72 p.a.), funded as follows:'),
  table(['Policy', 'Owner / funded by', 'Premium (p.a.)'], [
    ['Personal protection', 'Steven — personal cash flow', '$10,195.44'],
    ['Key person (Keyman)', 'Engineering Solutions Tasmania — business', '$3,761.04'],
    ['Buy/Sell', 'Steven — personal cash flow', '$5,100.24'],
    ['Total', '', '$19,056.72'],
  ], [34, 44, 22]),
  P('The personal and Buy/Sell premiums (together about $1,274.64 per month) are to be met from your personal surplus cash flow (approximately $6,000 per month), and are comfortably affordable. The Key Person premium is met by the business. The replaced business cover represents a saving of $1,043.64 p.a. compared with your current MetLife premiums; the personal cover is additional new cost.'),

  H1('9. Fees & commissions'),
  P('I do not charge you a fee for this advice. Pareto Group Pty Ltd receives commission from the product provider, from which I may receive a share. Commissions are not an additional cost to you. The commission on the recommended Acenda policies (GST inclusive, 66% upfront / 22% ongoing) is:'),
  table(['Policy', 'Annual premium', 'Upfront (66%)', 'Ongoing p.a. (22%)'], [
    ['Personal protection', '$10,195.44', '$6,729.00', '$2,243.00'],
    ['Buy/Sell', '$5,100.24', '$3,366.16', '$1,122.05'],
    ['Key person (Keyman)', '$3,761.04', '$2,482.29', '$827.43'],
    ['Total', '$19,056.72', '$12,577.45', '$4,192.48'],
  ], [34, 22, 22, 22]),
  P('I am an Authorised Representative of Pareto Group Pty Ltd and may receive up to 50% of the commissions Pareto receives. Renewal commission continues for the life of the policies.', { color: GREY, italics: true }),

  H1('10. Important information & risks'),
  bullet('Acceptance of the new cover is subject to underwriting; premiums may be varied and loadings or exclusions may be applied based on your health, pastimes or occupation.'),
  bullet('If you take less cover than recommended, you may not be fully protected.'),
  bullet('Premiums are stepped and will increase with age; if premiums are not paid, cover will lapse.'),
  bullet('For the business-owned (Key Person) cover, the tax treatment of premiums and any claim proceeds depends on the purpose of the cover — you should confirm the treatment with your accountant.'),
  bullet('Buy/Sell cover should be supported by a current, properly drafted buy/sell agreement; you should ensure your agreement remains in place and up to date.'),
  bullet('Do not cancel your existing MetLife cover until the new Acenda cover has been accepted and is in force.'),

  H1('11. Your duty of disclosure'),
  P('Before entering into a life insurance contract, you have a duty under the Insurance Contracts Act 1984 (Cth) to take reasonable care not to make a misrepresentation to the insurer — answering the insurer’s questions honestly, accurately and completely. Your duty continues until the insurer confirms the cover in writing; if your health or circumstances change before then, you must tell the insurer. If you do not meet this duty, the insurer may reduce or decline a claim, or cancel the policy.'),

  H1('12. Other things you should know'),
  bullet('Approved Product List: I can only recommend products on Pareto Group’s Approved Product List.'),
  bullet('Cooling off: you generally have a cooling-off period to cancel a new policy — see the PDS.'),
  bullet('Advice expiry: this advice is valid for 30 days from the date of this SOA.'),
  bullet('Estate planning: you hold a current Will (with testamentary trust) and Powers of Attorney; given your business interests, I recommend you review these — and your buy/sell agreement — periodically with your solicitor. Estate planning and legal work are outside the scope of this SOA.'),
  bullet('Superannuation / SMSF: your cover is recommended to be held personally and by the business (not via super); I have not provided superannuation or SMSF advice in this SOA.'),

  H1('13. Authority to proceed'),
  P('By signing below, I confirm that I have received and read this Statement of Advice, the FSG and the relevant PDS(s); that the information about me is correct; and that I authorise Tristan Biro / Lakeside Financial to proceed with the advice set out above.'),
  spacer(160),
  table(['Client', 'Signature', 'Date'], [['Steven Banbury', '', '']], [40, 40, 20]),
  spacer(200),
  new Paragraph({ children: [run('Adviser: Tristan Biro (FP) — Authorised Representative No. 001313019', { size: 20 })] }),
  new Paragraph({ children: [run('Signature: __________________________     Date: ______________', { size: 20 })] }),
  new Paragraph({ spacing: { before: 200 }, children: [run('Lakeside Financial Pty Ltd — Authorised Representative of Pareto Group Pty Ltd — AFSL 418700 — ABN 11 155 278 078', { size: 16, color: GREY })] }),
  new Paragraph({ children: [run('General advice warning: parts of this document contain general information only. Before acting you should consider its appropriateness having regard to your objectives, financial situation and needs.', { size: 16, color: GREY, italics: true })] }),
];

// ---- Appendix (educational) ----
const appendix = [
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('APPENDIX TO STATEMENT OF ADVICE', { bold: true, size: 24, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run('Prepared by Tristan Biro (FP) — Authorised Representative No. 001313019', { size: 18, color: GREY })] }),
  H1('Personal Insurance'),
  P('Financial planning is about protecting your wealth as well as building it. It is easy to assume we won’t get sick or hurt and to overlook the need to protect the very thing that generates our wealth — our health and our ability to work. But if an accident or serious illness does occur, the impact can be devastating.'),
  P('No matter how well you manage your finances, there is always a risk of early death, serious illness or injury. Where that leaves you, your family and your business depends on the protection strategy you have in place. Risks you could face may include:'),
  bullet('Emotional, physical or mental trauma;'),
  bullet('Death or serious illness;'),
  bullet('Loss of income, or the loss of a key person to a business, due to temporary or permanent incapacity.'),
  P('Your plan should include a strategy to minimise risks that could jeopardise your present and future plans. In simple terms, if you cannot afford to lose something, you should try to protect your exposure. Insurance provides a cost-effective protection mechanism.'),
  H2('Life Insurance'),
  P('Life insurance pays a lump sum on death, or in some cases terminal illness. It can be used to pay off debts, provide an income for dependants, cover final expenses, fund a business succession (buy/sell) arrangement, or provide a legacy.'),
  H2('Total and Permanent Disability (TPD) Insurance'),
  P('TPD insurance pays a lump sum if you become permanently unable to work, unable to care for yourself, or suffer significant permanent cognitive impairment. The definition can vary — “Any Occupation” (less expensive, harder to meet) or “Own Occupation” (a more generous definition suited to specialist occupations, but more expensive).'),
  H2('Trauma (Critical Illness) Insurance'),
  P('Trauma insurance pays a lump sum on diagnosis of a specified illness or injury such as cancer, heart attack or stroke, regardless of whether you can return to work — designed to relieve financial pressure while you focus on recovery.'),
  H2('Business Insurance — Key Person and Buy/Sell'),
  P('Key person insurance protects a business against the financial loss caused by the death, disability or serious illness of a key individual — providing funds to cover lost revenue and the cost of finding a replacement. It is generally owned by the business.'),
  P('Buy/Sell (business succession) insurance funds an agreement between business owners so that, if one owner dies or becomes totally and permanently disabled, the remaining owner(s) can purchase that owner’s share. It provides the exiting owner’s estate with fair value, and the business with certainty and continuity. It should be supported by a properly drafted buy/sell agreement.'),
  H2('Premiums'),
  P('Premiums vary with age, gender, smoking status, occupation and medical history. The two main options are:'),
  bullet('Level premiums — the rate is fixed at commencement (except CPI indexation). Initially higher, but more stable over time.'),
  bullet('Stepped premiums — the rate increases each year with age. Initially more affordable, but can become more expensive over time.'),
  H2('Ownership'),
  P('Life, TPD and income protection can be owned personally, through a business/company, or through superannuation; trauma is owned personally or by a business. Each option has advantages and disadvantages:'),
  table(['Inside Superannuation', 'In Personal / Business Name'], [
    ['Advantages', 'Advantages'],
    ['Premiums funded from super balance/contributions, reducing personal cash-flow impact; may be tax-effective within the fund.', 'Claim proceeds are usually tax-free (personal); business-owned cover can be tailored to key-person and succession purposes; broader benefit/feature set; you deal directly with the insurer.'],
    ['Disadvantages', 'Disadvantages'],
    ['May have fewer benefits/features; premiums reduce retirement savings; proceeds may be taxed and require a condition of release before access.', 'Premiums are generally funded from after-tax cash flow (business/personal); tax treatment of business-owned cover depends on its purpose — seek accounting advice.'],
  ], [50, 50]),
  H2('Taxation'),
  P('How premiums and proceeds are taxed depends on the type of cover, the owner/beneficiary, the purpose of the cover, and whether it is held inside or outside super. You should seek specialist taxation advice for your circumstances, particularly for business-owned (key person) cover.'),
  H2('Application and Underwriting'),
  P('When applying for insurance you will complete an application providing personal and medical information so the underwriter can assess it. You may be asked to undergo a medical examination, blood tests, or provide a report from your doctor. Depending on your health, a loading or exclusion may be applied. Many policies are guaranteed renewable — as long as you pay the premium, cover continues regardless of changes in your health or circumstances. If you stop paying premiums, your cover will lapse.'),
  new Paragraph({ spacing: { before: 200 }, children: [run('This appendix contains general information only and does not take into account your objectives, financial situation or needs.', { size: 16, color: GREY, italics: true })] }),
];

const doc = new Document({
  creator: 'Lakeside Financial',
  title: 'Steven Banbury - Statement of Advice',
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: [...title, ...body, ...appendix] }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log('Generated:', OUT);
