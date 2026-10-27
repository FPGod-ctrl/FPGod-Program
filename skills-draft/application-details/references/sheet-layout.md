# Application details sheet: layout

Version 0.1.0-draft. Built from the description of the first sheet (22 Oct 2026). The builder was
not kept and no firm template exists, so this layout is a proposal until confirmed [Q-AD-1].

Word, A4 portrait, Arial 10. Tables with grid lines. Couple = two value columns; single = one.

## Top

```
<Surname(s)> - Application Details            Prepared <dd/mm/yyyy>
Insurer: [INSURER_A] <product>                 Adviser on application: Josh Davidson [Q-AD-9]

CHECK BEFORE LODGING   (red, bold)
- <hit 1>
- <hit 2>
```

## Sections (rows), in order

| Section | Rows |
|---|---|
| Personal | Full name; title; gender; date of birth; age now; age next birthday; next birthday date; smoker status; residency / citizenship [Q-AD-8] |
| Contact | Mobile; other phone; address; postal address; email address |
| Occupation and income | Occupation (actual); occupation on quote; employer; duties; hours per week; employment type; years in role; annual income (gross); income structure (salary / self-employed) |
| Cover applied for | Per cover type: cover type; sum insured or monthly benefit; waiting period; benefit period; premium structure; ownership (super / non-super); linked to; options; premium; quote number; quote date; days old at lodging |
| Health and lifestyle | Height; weight; conditions from file notes (quoted); medications; family history; pastimes / travel [Q-AD-4] |
| Existing cover and payment | Existing insurer and policy number; what happens to it (cancel after acceptance / reduce / keep); payment method; funding fund (if super) [Q-AD-10]; beneficiaries [Q-AD-11] |

Each cell: the fact, or `NOT FOUND - ask client`.

## Source column (optional)

A narrow third (or fourth) column naming the source of each row (Fact Find, SOA, Quote <no.>,
File note <date>) makes checking quicker [Q-AD-14].

## Making the .docx

Any tool that writes a plain .docx is fine (e.g. the `docx` npm package in `server/node_modules`,
or python-docx). Red = RGB C00000. The check list must be first on the page.
