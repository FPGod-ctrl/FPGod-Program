// Adam James insurance-only SOA — a clean, self-designed compliant format
// (NOT the firm template). Built with the standards-compliant `docx` library.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, TabStopType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../generated-plans/Adam James - Statement of Advice (with appendix).docx');

const BRAND = '4C9A2A';    // Lakeside / financial-plan green (title, rules)
const ACCENT = '2E5A17';   // dark green — readable heading & table-header text
const HDR_FILL = 'CDE3BF'; // soft green tint for table headers
const GREY = '595959';
const FONT = 'Calibri';

// ---- helpers ----
const run = (text, o = {}) => new TextRun({ text, bold: o.bold, italics: o.italics, color: o.color, size: o.size ?? 20, font: FONT, break: o.break });
const P = (text, o = {}) => new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 140, line: 276 }, children: Array.isArray(text) ? text : [run(text, o)] });
const H1 = (text) => new Paragraph({ spacing: { before: 240, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND } }, children: [run(text, { bold: true, size: 26, color: ACCENT })] });
const H2 = (text) => new Paragraph({ spacing: { before: 160, after: 80 }, children: [run(text, { bold: true, size: 22, color: ACCENT })] });
const bullet = (text) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 276 }, children: [run(text)] });

function cell(text, o = {}) {
  const children = Array.isArray(text)
    ? text
    : [new Paragraph({ spacing: { after: 20, line: 264 }, alignment: o.align, children: [run(text, { bold: o.bold, color: o.color, size: 19 })] })];
  return new TableCell({
    children, shading: o.fill ? { fill: o.fill } : undefined,
    width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  });
}

function table(headers, rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 2, color: 'BFBFBF' };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  const headRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, { bold: true, fill: HDR_FILL, color: ACCENT, width: widths && widths[i] })),
  });
  const dataRows = rows.map((r) => new TableRow({
    children: r.map((c, i) => Array.isArray(c) ? bulletCell(c, widths && widths[i]) : cell(String(c), { width: widths && widths[i] })),
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: [headRow, ...dataRows] });
}

// a table cell whose content is a bulleted list
function bulletCell(items, width) {
  const paras = items.map((t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 30, line: 264 }, children: [run(t, { size: 19 })] }));
  return new TableCell({ children: paras, width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined, margins: { top: 40, bottom: 40, left: 140, right: 80 } });
}

const spacer = (h = 80) => new Paragraph({ spacing: { after: h }, children: [] });

// ---- title page ----
const title = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 60 }, children: [run('STATEMENT OF ADVICE', { bold: true, size: 52, color: BRAND })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1000 }, children: [run('Personal Insurance', { size: 30, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Prepared for', { size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [run('Adam James', { bold: true, size: 36 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Prepared by', { size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Tristan Biro (FP)', { bold: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Authorised Representative No. 001313019', { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Lakeside Financial Pty Ltd', { size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('Suite 201, 429 Bay Street, Brighton VIC 3186  ·  03 9596 5111', { size: 18, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [run('Authorised Representative of Pareto Group Pty Ltd  ·  AFSL 418700  ·  ABN 11 155 278 078', { size: 18, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Date of advice: 2 July 2026', { bold: true, size: 22 })] }),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

// ---- body ----
const body = [
  H1('About this Statement of Advice'),
  P('This Statement of Advice (SOA) sets out the personal insurance advice I am providing to you, Adam James, and my reasons for it. It is an important document — please read it carefully before deciding whether to act on my advice.'),
  P('This SOA should be read together with the Financial Services Guide (FSG), my Adviser Profile, and the Product Disclosure Statement (PDS) and Target Market Determination (TMD) for each product referred to. My advice is limited to the scope set out in Section 1 and does not consider any needs outside that scope.'),
  P('My advice is based on the information you have provided. If any of the information recorded in this document is incorrect or incomplete, please let me know, as my advice may not be appropriate. This advice is valid for 30 days from the date shown above.'),

  H1('1. Scope of my advice'),
  P('You have asked me to review your personal (risk) insurance only. Based on our discussions, the scope of this advice is:'),
  table(['Protection need', 'In / Out of scope'], [
    ['Life (Death) cover', 'IN SCOPE'],
    ['Total & Permanent Disability (TPD) cover', 'OUT — existing cover to be cancelled at your direction (see Section 6)'],
    ['Trauma / Critical Illness cover', 'OUT of scope'],
    ['Income Protection', 'OUT of scope'],
  ], [55, 45]),
  P('This advice does not address superannuation, investments, retirement planning, debt or estate planning, other than as they relate to the insurance advice above. You may have other needs this SOA does not cover.', { italics: true, color: GREY }),

  H1('2. About you'),
  P('You have recently entered a new relationship and are reviewing your finances accordingly. You have two children, Hunter (17) and Teisha (20).'),
  P('Following a previous insurance claim, your personal debts have been cleared and you consider your children to be well provided for, and your business is performing well. Your insurance needs have changed as a result, and this advice reflects those changed circumstances.'),
  H2('Your details'),
  table(['Detail', 'Your information'], [
    ['Full name', 'Adam James'],
    ['Date of birth', '09/04/1970 (age 56)'],
    ['Residential address', '14 Kiri Court, Buderim QLD 4556'],
    ['Contact', '0477 977 997  ·  adam@mylifescool.com.au'],
    ['Occupation / employment', 'Health Product Sales Business — self-employed, full-time'],
    ['Annual income', '$300,000 p.a.'],
    ['Super contributions', '$30,000 p.a.'],
    ['Smoker status', 'Non-smoker'],
    ['Dependants', 'Hunter (19) and Teisha (22)'],
    ['Estate planning', 'Will and Powers of Attorney in place (see “Related matters we discussed”)'],
  ], [30, 70]),
  H2('Your financial position (summary)'),
  table(['Assets', 'Value', 'Liabilities', 'Balance'], [
    ['Family home (QLD)', '$1,000,000', 'Home loan', '$0'],
    ['Superannuation (SMSF)', '$400,000', '', ''],
    ['Total assets', '$1,400,000', 'Total debts', '$0'],
  ], [35, 20, 30, 15]),
  new Paragraph({ spacing: { before: 100, after: 140 }, children: [run('Total net worth: $1,400,000', { bold: true, size: 22, color: ACCENT })] }),

  H1('3. Your goals & objectives'),
  P('Your circumstances have changed recently, and your goals for this advice reflect that.'),
  H2('Personal and estate objectives'),
  P('You have recently entered a new relationship and wish to structure your affairs so that the assets you have built are ultimately preserved for your children, your partner’s assets pass to her children, and any assets you create together from this point are shared between all parties.'),
  H2('Insurance objectives'),
  P('Following a previous insurance claim, your personal debts have been cleared and you consider your children to be well provided for. Your primary insurance objective is therefore to maintain a level of life cover so that your new partner & children would be financially secure in the event of your death in the near future.'),
  P('You anticipate needing life cover for approximately the next five years. From around age 60 you expect to be able to access your superannuation, at which point your reliance on life cover reduces.'),
  P('You no longer consider Total & Permanent Disability (TPD) cover necessary — your children are becoming established and your business is performing well — and you have asked that it be cancelled.'),

  H1('4. Your existing insurance'),
  P('Your existing cover, all held with MetLife under policy PN20000044680 (commenced 03/08/2023) and owned personally, is:'),
  table(['Cover', 'Sum insured', 'Owner', 'Premium (p.a.)', 'Type', 'Action'], [
    ['Life', '$1,106,700', 'Adam James', '$2,442.72', 'Stepped', 'Replace'],
    ['TPD (Any)', '$830,025', 'Adam James', '$2,108.28', 'Stepped', 'Cancel'],
  ], [16, 20, 18, 18, 12, 16]),
  P('Your current combined premium is approximately $4,551 per annum with a renewal shortly looking to increase this amount. This policy is approaching its third anniversary in August 2026, at which point the premiums are scheduled to increase significantly — one of the reasons we are reviewing your cover now.'),

  H1('5. My recommendations'),
  P('I recommend that you:'),
  bullet('Establish a new Acenda (Nippon Life) Life Cover policy of $1,000,000, owned personally, on a stepped premium; and'),
  bullet('Once that policy is accepted and in force, cancel your existing MetLife Life Cover ($1,106,700) and MetLife TPD Cover ($830,025). Do not cancel your existing cover until the new policy is confirmed as in force.'),
  spacer(),
  H2('Recommended cover'),
  table(['Cover', 'Insurer / product', 'Sum insured', 'Owner', 'Premium', 'Type'], [
    ['Life', 'Acenda (Nippon Life) — new policy', '$1,000,000', 'Adam James', '$170.18 p.m. ($2,042.16 p.a.)', 'Stepped'],
  ], [12, 28, 16, 15, 21, 8]),

  H1('6. Why my advice is appropriate'),
  H2('Life Cover — $1,000,000'),
  P('The Life Cover recommended is intended to ensure your new partner & children would be financially secure in the event of your death in the near future. As your children are already well provided for and your personal debts have been cleared, this cover is focused on additional wealth for your partner & children rather than on clearing debt or providing for dependants.'),
  P('You anticipate holding this cover for approximately the next five years — until you are able to access your superannuation from around age 60 — after which your need for life cover is expected to reduce. A sum insured of $1,000,000 provides your partner with a substantial lump sum during this period, and we can review and reduce the cover as your circumstances change.'),
  P('I have recommended a stepped premium. Over a shorter expected holding period of around five years, a stepped premium is more cost-effective than a level premium (which is generally only worthwhile where cover is held long-term and obtained younger). I recommend the cover be held personally (outside superannuation) and owned by you, so the benefit is paid directly to your estate or nominated beneficiaries.'),
  P('Your existing MetLife policy is approaching its third anniversary in August 2026, at which point its premiums are scheduled to increase significantly. To address this, I recommend replacing it with a more competitive Acenda (Nippon Life, formerly MLC) Life Cover policy. Acenda applies a 7.5% lifetime discount to the new policy, providing better value over the five years you anticipate holding the cover.'),
  P('Both products achieve a 100% core score for Life Cover under our research (Xplan Risk Researcher), so you retain equivalent core cover. Together with cancelling the TPD cover, moving your Life Cover to Acenda produces an overall saving of approximately $2,508.84 per annum. Acenda also offers a Premium Freeze / Economiser feature, a Terminal Illness Support booster, a premium waiver after three months’ disablement (compared with six months under MetLife), and access to Vivo Virtual Care. In moving insurers you will no longer have MetLife’s Grief Counselling and Involuntary Unemployment benefits, which I have discussed with you.'),
  H2('Cancellation of your TPD Cover'),
  P('You have advised that you no longer require TPD cover given your financial position and you no longer see the value in maintaining this type of cover. Accordingly, I recommend cancelling your existing MetLife TPD Cover of $830,025 and I have not recommended any replacement.'),
  P('Please understand that once this cover is cancelled you will not receive a benefit if you become totally and permanently disabled. If you wish to take out TPD cover again in future, you would need to apply and be underwritten again, which may result in a higher premium, exclusions, or cover being declined based on your health at that time. You have confirmed you understand and accept this and wish to proceed.', { bold: false }),

  H1('7. Replacing your existing cover'),
  P('My advice involves replacing an existing insurance product. The table below outlines the key differences and the consequences of replacement. You should not cancel your existing cover until your new cover is in force.'),
  table(['', 'Terminating — MetLife', 'New — Acenda'], [
    ['Policy / product', 'MetLife Protect (PN20000044680)', 'Acenda Insurance (new)'],
    ['Cover type', 'Life & TPD', 'Life only'],
    ['Sum insured', 'Life $1,106,700 + TPD $830,025', 'Life $1,000,000'],
    ['Owner / life insured', 'Adam James', 'Adam James'],
    ['Premium (p.a.)', '$4,551.00', '$2,042.16'],
    ['Benefits gained', '—', ['Premium Freeze / Economiser feature', 'Terminal Illness Support booster', 'Premium waiver after 3 months’ disablement (vs 6 months)', 'Vivo Virtual Care access']],
    ['Benefits lost', ['Grief Counselling benefit', 'Involuntary Unemployment benefit', 'TPD cover ceases entirely'], '—'],
  ], [20, 40, 40]),
  P('Risks of replacement you should be aware of: a new 13-month suicide exclusion and standard exclusions/underwriting will apply to the new policy; you may be subject to loadings or exclusions based on your current health; and you should not cancel your MetLife cover until the Acenda cover is accepted and in force.', { italics: true, color: GREY }),

  H1('8. What it costs (premium affordability)'),
  P('The total insurance premium recommended is $170.18 per month ($2,042.16 per annum). This is to be held in your personal name and funded from your surplus cash flow. This represents an overall saving of $2,508.84 per annum compared with your current MetLife premiums.'),

  H1('9. Fees & commissions'),
  P('I do not charge you a fee for this advice. Pareto Group Pty Ltd receives commission from the product provider, from which I may receive a share. Commissions are not an additional cost to you. The commission on the recommended Acenda policy (GST inclusive) is:'),
  table(['Product', 'Annual premium', 'Type', 'Rate', 'Commission'], [
    ['Acenda Insurance', '$2,042.16', 'Upfront (year 1)', '66%', '$1,347.83'],
    ['Acenda Insurance', '$2,042.16', 'Ongoing (p.a.)', '22%', '$449.28'],
  ], [26, 18, 22, 12, 22]),
  P('I am an Authorised Representative of Pareto Group Pty Ltd and may receive up to 50% of the commissions Pareto receives. Renewal commission continues for the life of the policy.', { color: GREY, italics: true }),

  H1('10. Important information & risks'),
  bullet('Acceptance of the new cover is subject to underwriting; premiums may be varied and loadings or exclusions may be applied.'),
  bullet('If you take less cover than recommended, you may not be fully protected.'),
  bullet('Premiums are stepped and will increase with age; if you stop paying premiums your cover will lapse.'),
  bullet('Do not cancel your existing MetLife cover until the new Acenda cover has been accepted and is in force.'),

  H1('11. Your duty of disclosure'),
  P('Before entering into a life insurance contract, you have a duty under the Insurance Contracts Act 1984 (Cth) to take reasonable care not to make a misrepresentation to the insurer. This means answering the insurer’s questions honestly, accurately and completely. Your duty continues until the insurer confirms the cover in writing — if your health or circumstances change before then, you must tell the insurer. If you do not meet this duty, the insurer may reduce or decline a claim, or cancel the policy.'),

  H1('12. Other things you should know'),
  bullet('Approved Product List: I can only recommend products on Pareto Group’s Approved Product List.'),
  bullet('Cooling off: you generally have a cooling-off period to cancel a new policy — see the PDS.'),
  bullet('Advice expiry: this advice is valid for 30 days from the date of this SOA.'),
  bullet('Estate planning: you hold a current Will (with testamentary trust) and Powers of Attorney; I recommend you review these periodically.'),

  H1('Related matters we discussed (outside the scope of this advice)'),
  P('The following matters were discussed but fall outside the scope of this insurance advice. They are recorded for completeness, and where noted I recommend you seek specialist advice.'),
  H2('Superannuation and retirement'),
  P('You expect to be able to access your superannuation from around age 60, which is why you anticipate needing life cover for only around the next five years. I have not provided superannuation or retirement advice in this SOA.'),
  H2('Wills and estate planning'),
  P('Given your new relationship and your objective to preserve assets for your respective children, we discussed the benefits of comprehensive Wills incorporating testamentary trusts. A testamentary trust can provide asset protection (the inheritance is held in trust rather than owned personally by the beneficiary, helping protect it in the event of a beneficiary’s relationship breakdown or financial difficulty) and tax effectiveness (income can be streamed to multiple beneficiaries in a tax-effective way).'),
  P('I recommend that you and your partner obtain comprehensive Wills with testamentary trusts, make binding death-benefit nominations for your superannuation (which is dealt with separately from your Will), and consider a formal financial agreement to delineate the assets each of you held before the relationship. I suggest engaging a Queensland solicitor to implement these. Estate planning and legal work are outside the scope of this SOA, and I am not licensed to provide legal advice.'),
  H2('Cover for your partner'),
  P('We also discussed arranging life cover for your partner, who currently holds none. This will be addressed in a separate recommendation and does not form part of this advice.'),

  H1('13. Authority to proceed'),
  P('By signing below, I confirm that I have received and read this Statement of Advice, the FSG and the relevant PDS(s); that the information about me is correct; and that I authorise Tristan Biro / Lakeside Financial to proceed with the advice set out above.'),
  spacer(160),
  table(['Client', 'Signature', 'Date'], [
    ['Adam James', '', ''],
  ], [40, 40, 20]),
  spacer(200),
  new Paragraph({ children: [run('Adviser: Tristan Biro (FP) — Authorised Representative No. 001313019', { size: 20 })] }),
  new Paragraph({ children: [run('Signature: __________________________     Date: ______________', { size: 20 })] }),
  new Paragraph({ spacing: { before: 200 }, children: [run('Lakeside Financial Pty Ltd — Authorised Representative of Pareto Group Pty Ltd — AFSL 418700 — ABN 11 155 278 078', { size: 16, color: GREY })] }),
  new Paragraph({ children: [run('General advice warning: parts of this document contain general information only. Before acting you should consider its appropriateness having regard to your objectives, financial situation and needs.', { size: 16, color: GREY, italics: true })] }),
];

// ---- Appendix (educational — from firm template) ----
const appendix = [
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('APPENDIX TO STATEMENT OF ADVICE', { bold: true, size: 24, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run('Prepared by Tristan Biro (FP) — Authorised Representative No. 001313019', { size: 18, color: GREY })] }),
  H1('Personal Insurance'),
  P('Financial planning is about protecting your wealth as well as building it. It is easy to assume we won’t get sick or hurt and to overlook the need to protect the very thing that generates our wealth — our health and our ability to work. But if an accident or serious illness does occur, the impact can be devastating.'),
  P('No matter how well you manage your finances, there is always a risk of early death, serious illness or injury. Where that leaves you and your loved ones depends on the wealth-protection strategy you have in place. Risks you could face may include:'),
  bullet('Emotional, physical or mental trauma;'),
  bullet('Death or serious illness;'),
  bullet('Loss of income due to temporary or permanent incapacity.'),
  P('Your financial plan should include a strategy to minimise risks that could jeopardise your present and future plans. In simple terms, if you cannot afford to lose something, you should try to protect your exposure. Insurance provides a cost-effective protection mechanism, and it is best to tailor a package that suits your needs as well as your budget.'),
  H2('How the strategy works'),
  P('Personal risk insurance protects your wealth-accumulation strategy by providing money if you are no longer able to earn an income due to disability, trauma or death. The money received can help with medical bills, loan repayments and living expenses. Many people underestimate the importance of personal insurance, which has contributed to widespread underinsurance in Australia.'),
  H2('Life Insurance'),
  P('The most common type of cover is life insurance (term life). Life insurance pays a lump sum to your estate or nominated beneficiaries in the event of death, or in some cases terminal illness. It can be used to pay off debts, provide an income for dependants, cover funeral expenses and help maintain your family’s lifestyle.'),
  H2('Total and Permanent Disability (TPD) Insurance'),
  P('TPD insurance pays a lump sum if you suffer an illness or injury and become permanently unable to work again, are unable to care for yourself, or suffer significant permanent cognitive impairment. The lump sum can be used for medical expenses, ongoing care and living costs. The definition of TPD can vary:'),
  bullet('Any Occupation TPD — pays if you are unlikely to ever work in any occupation suited to your education, training or experience. Generally less expensive, but harder to meet.'),
  bullet('Own Occupation TPD — pays if you are unlikely to ever work in your own occupation. A more generous definition, particularly suited to specialist occupations, but more expensive.'),
  H2('Trauma (Critical Illness) Insurance'),
  P('Trauma insurance pays a lump sum on the diagnosis of a specified illness or injury such as life-threatening cancer, stroke or heart attack. The payment is made regardless of whether you can return to work, and is designed to relieve financial pressure while you focus on recovery.'),
  H2('Income Protection Insurance'),
  P('Income Protection aims to replace income lost during a prolonged absence from work due to sickness or injury, usually paying up to 70% of your gross income after a waiting period. Key features include:'),
  bullet('Waiting period — the time you must be off work before a benefit is payable (from 14 days to two years). A longer waiting period generally means a lower premium.'),
  bullet('Benefit period — the maximum time the benefit is paid (e.g. two years, five years, or to a specified age such as 65).'),
  bullet('Agreed value vs Indemnity — agreed value fixes the benefit at application; indemnity assesses your income at the time of claim. Since October 2021, only indemnity contracts are available on new policies.'),
  P('Income Protection premiums are generally tax-deductible, but benefit payments are assessable income.'),
  H2('Premiums'),
  P('Premiums vary with age, gender, smoking status, occupation and medical history. The two main options are:'),
  bullet('Level premiums — the rate is fixed at commencement (except for CPI indexation). Initially higher, but more stable over time and less likely to become unaffordable as you age.'),
  bullet('Stepped premiums — the rate increases each year with age. Initially more affordable, but can become more expensive over time.'),
  H2('Ownership'),
  P('Life, TPD and income protection can be owned personally or through a superannuation fund; trauma is owned personally. When held in super, the policy is owned by the trustee for the benefit of the member. Each option has advantages and disadvantages:'),
  table(['Inside Superannuation', 'In Personal Name'], [
    ['Advantages', 'Advantages'],
    ['Premiums are funded from your super balance or contributions, reducing the impact on personal cash flow; premiums may be tax-effective within the fund.', 'Claim proceeds are usually tax-free; cover can generally include a broader range of benefits and features; you deal directly with the insurer.'],
    ['Disadvantages', 'Disadvantages'],
    ['Policies may have fewer benefits and features; premiums reduce your retirement savings; claim proceeds may be taxed and require a condition of release before you can access them.', 'Premiums are funded from your after-tax cash flow (except income protection, which is generally deductible).'],
  ], [50, 50]),
  H2('Taxation'),
  P('How premiums and proceeds are taxed depends on the type of cover, the beneficiary, and whether the policy is held inside or outside super. You should seek specialist taxation advice for your circumstances.'),
  table(['', 'Inside Superannuation', 'In Personal Name'], [
    ['Premiums', 'Generally deductible to the fund.', 'Not deductible, except income protection premiums.'],
    ['Claim proceeds', 'Life proceeds may be taxable if paid to a non-dependant; TPD proceeds may be partly taxable.', 'Proceeds from a life, TPD or trauma policy are generally tax-free.'],
  ], [18, 41, 41]),
  H2('Application and Underwriting'),
  P('When applying for insurance you will complete an application providing personal and medical information so the underwriter can assess it. You may be asked to undergo a medical examination, blood tests, or provide a report from your doctor. Depending on your health, a loading or exclusion may be applied. Many policies are guaranteed renewable — as long as you pay the premium, cover continues regardless of changes in your health or circumstances. If you stop paying premiums, your cover will lapse.'),
  new Paragraph({ spacing: { before: 200 }, children: [run('This appendix contains general information only and does not take into account your objectives, financial situation or needs.', { size: 16, color: GREY, italics: true })] }),
];

const doc = new Document({
  creator: 'Lakeside Financial',
  title: 'Adam James - Statement of Advice',
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
    children: [...title, ...body, ...appendix],
  }],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log('Generated:', OUT);
