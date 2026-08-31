# Task: build the Legacy Risk Advice SOA generator

Everything needed to make the generator produce a Statement of Advice at the
standard this practice actually requires.

## Where things go

| Folder | What goes in it |
|--------|-----------------|
| `templates/` | The firm's **blank** SOA template(s). The master document with headings, fixed wording and empty fields. |
| `examples/` | **Completed** SOAs written for real clients, filed by case type. |
| `examples/new-cover/` | Straightforward new cover, nothing being replaced. |
| `examples/replacement/` | Existing cover being replaced or cancelled. |
| `examples/inside-super/` | Cover held inside superannuation. |

Keep templates and examples separate: a blank template defines the required
structure, while a completed SOA shows how the structure gets filled and how
much depth each section carries. They are read differently.

Filing an example by case type saves me inferring it, and the three types
genuinely differ — a replacement SOA carries comparison tables and the
do-not-cancel warning that a new-cover SOA has no reason to include. If a
document does not fit any of them, or spans two, leave it at the `examples/`
root and I will work it out.

Nest further whenever it helps — `examples/replacement/business-owner/`, or a
`superseded/` folder beside a template when a newer version arrives. Depth is
free; ambiguity is not.

## Most useful, in order

1. **The blank SOA template.** Worth more than several completed ones — it
   carries the section structure and the fixed compliance wording with none of
   the client-specific noise.
2. **A completed SOA that replaces existing cover.** The most compliance-heavy
   case and where a generator most easily goes wrong.
3. **A straightforward new-cover SOA.**
4. **One with cover held inside super**, ideally a self-employed or business client.

Three or four covering *different shapes* is far more useful than several
similar ones. One or two is still a workable start — better than guessing.

## What gets read out of them

- Section order, headings and numbering — this becomes the template that
  replaces the generator's default 14-section skeleton
- Fixed house wording reproduced verbatim rather than regenerated: general
  advice warning, duty to take reasonable care, cooling off, privacy,
  complaints and AFCA
- Legacy's licensee details — AR number, AFSL, ABN, address, phone. Every
  generated document currently prints `[ADVISOR TO CONFIRM]` in their place
- The needs-analysis method: how cover is actually sized in this practice.
  Income multiple or years to retirement? Are education costs included, and at
  what figure? Net of super or gross? Following the house method matters more
  here than any generic formula
- Table layouts for existing versus recommended cover
- Fee and commission disclosure format
- Tone, and how much is explained rather than asserted

## How the template gets used once identified

Imported into `training_data` with `kind='plan'`,
`metadata.doc_type='risk_soa'` and `metadata.is_template='true'`.
`riskSoaGenerator.js` picks it up automatically and drives generation from its
structure — no code change needed. Verified working against a test template.
