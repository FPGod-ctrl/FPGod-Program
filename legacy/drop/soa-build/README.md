# Task: build the Legacy Risk Advice SOA generator

Everything needed to make the generator produce a Statement of Advice at the
standard this practice actually requires.

## Where things go

| Folder | What goes in it | Status |
|--------|-----------------|--------|
| `templates/` | The firm's **blank** SOA template(s) — the master with headings, fixed wording and empty fields. | Waiting |
| `examples/` | **Completed** SOAs written for real clients. | 32 received |
| `quotes/` | Insurer quotes as they arrive — whatever format they come in. | Waiting |
| `comparisons/` | Product / contract comparisons: old policy versus new, or the research output behind a recommendation. | Waiting |
| `notes-emails/` | Meeting notes, file notes and client email threads. | Waiting |
| `fact-finds/` | Completed fact finds. | Waiting |

Templates and examples are read differently: a blank template defines the
required structure and fixed wording, a completed SOA shows how that structure
gets filled and how much depth each section carries.

The other four are the **personalisation inputs**. The structure of an SOA is
now known; what makes one genuinely personal is the client's own circumstances,
what was actually said in the meeting, the real quoted premiums, and the honest
comparison between what they hold and what is recommended. None of that can be
inferred — it has to come in.

One or two real samples of each is enough to build the ingestion. They do not
need to be for the same client, though a matched set for one client is the most
useful thing of all: fact find, notes, quotes, comparison and the finished SOA
that came out of them.

Case type — new cover, replacement, cover inside super — is read out of the
documents themselves, so there is no need to file by it.

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
