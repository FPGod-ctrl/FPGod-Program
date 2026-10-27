// Build a single combined, client-ready General Advice document (SOA-style layout)
// from the four topic guides, then render it to a branded Word doc.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HTMLtoDOCX from 'html-to-docx';
import { renderPlanHtml } from '../src/services/planRender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../../generated-plans');

const PARTS = [
  { file: 'Superannuation-Strategies-General-Advice', title: 'Part A — Superannuation strategies' },
  { file: 'Retirement-Income-Strategies-General-Advice', title: 'Part B — Retirement income strategies' },
  { file: 'Estate-Planning-Strategies-General-Advice', title: 'Part C — Estate planning strategies' },
  { file: 'Personal-Insurance-Strategies-General-Advice', title: 'Part D — Personal insurance strategies' },
];

// Take each guide's overview + strategy sections (## 2 .. up to "General risks"),
// dropping its own cover/purpose/glossary/legislation/disclaimer, and demote the
// numbered H2 section headings to H3 so they nest under the Part heading.
function extractBody(md) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^## 2\./.test(l));
  const end = lines.findIndex((l) => /^## \d+\.\s+General risks/.test(l));
  let body = lines.slice(start, end >= 0 ? end : undefined).join('\n');
  body = body.replace(/^## \d+\.\s+/gm, '### ');
  return body.trim().replace(/\n*---\s*$/, '').trim();
}

const front = `# LAKESIDE FINANCIAL
*Advice for life*

# Financial Strategy Guide
### General Advice — Superannuation, Retirement Income, Estate Planning & Insurance

| | |
|---|---|
| **Document type** | General advice (educational) — **not** a personal Statement of Advice |
| **Prepared by** | Lakeside Financial Pty Ltd |
| **Australian Financial Services Licensee** | Pareto Group Pty Ltd · ABN 11 155 278 078 · **AFSL No. 418700** |
| **Contact** | 03 9596 5111 |
| **Current as at** | 2025–26 financial year |

> **⚠ GENERAL ADVICE WARNING.** This document contains **general advice only**. It has been prepared **without taking into account your objectives, financial situation or needs**. Before acting on anything in this guide you should consider whether it is appropriate for you, having regard to your own circumstances, and obtain **personal financial advice**. You should also read the relevant **Product Disclosure Statement (PDS)** and **Target Market Determination (TMD)** before deciding on any financial product. This guide is **not** a Statement of Advice and is **not** a personal recommendation. Tax, superannuation and social-security rules change and many thresholds are indexed each year — figures are current for the **2025–26** financial year unless noted. Wills, trusts and powers of attorney must be prepared by a solicitor. Do **not** cancel any existing insurance until replacement cover is confirmed **in force**. Past performance is not a reliable indicator of future performance.

---

## How to use this guide

This guide brings together strategies people commonly use across four areas — **superannuation, retirement income, estate planning and personal insurance**. For each strategy we note **who it may suit**, **how it works**, and **what to consider**. None of it is a recommendation to you personally: it is a starting point for a conversation and for tailored, personal advice. Which strategies are right for you — and how they fit together — depends entirely on your circumstances.

### Contents
- **Part A — Superannuation strategies**
- **Part B — Retirement income strategies**
- **Part C — Estate planning strategies**
- **Part D — Personal insurance strategies**
- Glossary · Legislation referenced · Important information

---
`;

const back = `---

## Glossary

- **Concessional contribution** — a before-tax super contribution (employer SG, salary sacrifice, personal deductible); taxed 15% in the fund.
- **Non-concessional contribution (NCC)** — an after-tax super contribution; not taxed in the fund.
- **Carry-forward (catch-up)** — using unused concessional cap from the prior 5 years; available only if total super balance < $500,000 at the prior 30 June.
- **Bring-forward** — using up to 3 years of NCC cap in one year.
- **Proportioning rule** — a super withdrawal is drawn from the tax-free and taxable components in the same proportion as the whole interest.
- **Preservation age** — the age you can access super (60 for everyone born on/after 1 July 1964).
- **Transition to retirement (TTR)** — an income stream you can start at preservation age while still working.
- **Account-based pension** — a retirement-phase income stream; earnings tax-free within the Transfer Balance Cap.
- **Transfer Balance Cap (TBC)** — the lifetime limit ($2.0M, 2025–26) on what can move into tax-free retirement phase.
- **Taxable / tax-free component** — parts of a super balance; the taxable part can be taxed to non-dependant beneficiaries on death.
- **Tax dependant / non-dependant** — determines whether a super death benefit is tax-free or taxable.
- **Sequencing risk** — the risk of poor investment returns early in retirement while drawing income.
- **Means test** — the assets and income tests that determine Age Pension entitlement.
- **Testamentary trust** — a trust created by a Will, operating on death; provides asset protection and tax-effective income to beneficiaries.
- **Binding death benefit nomination** — a direction that compels the super trustee to pay your benefit as specified.
- **Enduring power of attorney** — authority to manage your affairs if you lose capacity.
- **TPD** — total and permanent disability cover; "own" vs "any" occupation definitions differ.
- **Income protection (IP)** — replaces part of your income during illness/injury; waiting and benefit periods apply.
- **Stepped / level premiums** — insurance premium structures that rise quickly with age vs more slowly.

---

## Legislation & rules referenced

**Superannuation & contributions:** concessional cap (ITAA 1997 Div 291); notice of intent (s290-170); carry-forward (s291-20); NCC caps & bring-forward (s292); downsizer (s292-102); spouse offset (s290-230); Division 293 (high income); FHSS (TAA 1953 Sch 1 Div 138); government co-contribution (Co-contribution Act 2003). **Retirement phase:** exempt current pension income (s295-385); Transfer Balance Cap (Subdiv 294-B); SAPTO (ITAA 1936 s160AAAA); TTR & income streams (SIS Regulations); Age Pension means testing & Work Bonus (Social Security Act 1991); aged-care fees (Aged Care Act). **Estate & death benefits:** death benefits to non-dependants (s302-145); proportioning rule (s307-125); super death benefit nominations (SIS Act 1993 & Regs). **Insurance:** insurance in super & nominations (SIS Act 1993 & Regs); deductibility & benefit taxation (ITAA 1997). **CGT:** Div 102/104/115/118. Proposed **Division 296** (>$3M super) is **not yet law**. Many figures are indexed — confirm current-year amounts.

---

> **Disclaimer & General Advice Warning.** This document is issued by Lakeside Financial Pty Ltd (Authorised Representative of Pareto Group Pty Ltd, AFSL 418700) and contains **general advice only** — it does **not** take into account your objectives, financial situation or needs. It is educational and is **not** a Statement of Advice or a personal recommendation, and **not** legal advice. Before acting, consider its appropriateness to your circumstances, obtain **personal financial advice** (and legal advice for Wills/trusts/POAs), and read the relevant **PDS** and **TMD**. Do not cancel existing insurance until replacement cover is confirmed in force. Tax, superannuation and social-security rules change and thresholds are indexed; figures are current for the **2025–26** financial year unless stated. Past performance is not a reliable indicator of future performance. Investment returns are not guaranteed.

*— End of Financial Strategy Guide (General Advice) —*
`;

const parts = PARTS.map((p) => {
  const md = fs.readFileSync(path.join(dir, p.file + '.md'), 'utf8');
  return `## ${p.title}\n\n${extractBody(md)}\n`;
}).join('\n---\n\n');

const combined = `${front}\n${parts}\n${back}`;

const mdOut = path.join(dir, 'Financial-Strategy-Guide-General-Advice.md');
fs.writeFileSync(mdOut, combined);
console.log('wrote', mdOut, '(' + combined.length + ' chars)');

// Render to branded Word doc (strip the duplicated letterhead/title the banner carries).
const body = combined.replace(/^# LAKESIDE FINANCIAL\s*\n\*Advice for life\*\s*\n+# [^\n]*\n### [^\n]*\n+/, '');
const html = renderPlanHtml({
  plan: { title: 'Financial Strategy Guide', content: body },
  client: null,
  theme: 'modern',
  accent: '#4C9A2A',
  firmName: 'Lakeside Financial',
  tagline: 'Advice for life — General advice strategy guide',
});
const docx = await HTMLtoDOCX(html, null, {
  orientation: 'portrait',
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
});
const buffer = Buffer.isBuffer(docx) ? docx : Buffer.from(await docx.arrayBuffer());
const docxOut = path.join(dir, 'Financial-Strategy-Guide-General-Advice.docx');
fs.writeFileSync(docxOut, buffer);
console.log('wrote', docxOut, '(' + buffer.length + ' bytes)');
