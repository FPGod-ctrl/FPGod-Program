# Client Profile — template + generator

The firm's **Client Profile – Client Information & Consent Form** (Lakeside
Financial). This is a data-entry/consent form and is kept **separate from the
financial-plan generators** — its own template, generator and output folder.

## Files

| File | Purpose |
|------|---------|
| `templates/Lakeside Client Profile Summary 2026.docx` | The firm's approved Word template (branding, logo, layout). Not edited by the generator. |
| `templates/client-profile.template.json` | **Blank, segmented** data template. Copy it, fill values, feed to the generator. |
| `server/scripts/generate-client-profile.mjs` | Generator. Clones the docx and fills the empty cells **in place** (byte-for-byte branding), then writes to `generated-profiles/`. |

## Usage (from `server/`)

```bash
# Fill a copy of the template, then:
node scripts/generate-client-profile.mjs <filled.json> ["<output.docx>"]

# Render the blank form:
node scripts/generate-client-profile.mjs ../templates/client-profile.template.json
```

With no output path, it writes `generated-profiles/<Client Name> - Client Profile.docx`
(named from `yourDetails.fullName.client`).

## Data shape (segments)

The JSON mirrors the form section-by-section — fill only what you know; **empty
values are left as blank cells (never guessed)**:

- `meta` — `{ adviser, date }`
- `yourDetails` — 15 paired fields `{ client, spouse }` (fullName, dateOfBirth,
  occupation, annualIncomeIncBonus, smoker, …) + `childrenDependents` (single).
- `estatePlanning` — `{ dateLastReviewed, hasWill, willAllowsTestamentaryTrust,
  hasPowersOfAttorney }`
- `goals` — `{ shortTerm, longTerm }`
- `assets[]` — `{ asset, location, value, owner }`. `value` may be `"$650,000"`
  or `650000`.
- `debts[]` — `{ debt, location, balance, bank, fixedOrVariable, ratePct,
  monthlyPayment }`
- `familyProtection` — `{ desiredOngoingIncome, clearInvestmentDebt,
  privateSchooling }`
- `consent` — 7 booleans (`fsg`, `privacy`, `electronicCommunications`, `tfn`,
  `disclosureInformation`, `disclosureToSpouse`, `authorisationToRenew`) +
  `{ clientName, signature, date }`. A `true` ticks the box (☐ → ☑).

## Notes

- **Totals are computed**, not entered: `TOTAL ASSETS`, `TOTAL DEBTS` and
  `TOTAL NET WEALTH` (= assets − debts) are summed from the row values, so the
  arithmetic is always internally consistent. Rows with a non-numeric/blank
  value are ignored in the sum.
- Extra `assets`/`debts` beyond the named rows spill into the template's blank
  rows (e.g. multiple investment properties).
- Clone-and-fill (not rebuild) avoids the html-to-docx corruption bug and keeps
  the firm's approved formatting exact — same approach as
  `generate-insurance-report.mjs`.
