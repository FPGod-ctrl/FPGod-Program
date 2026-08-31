# Drop folder — put Word documents here

This is the inbox. Anything you put here, Claude will read to work out the house
standard the generators have to hit.

## Formats

`.docx`, `.pdf`, `.md` and `.txt` all extract cleanly.

**`.doc` does not.** There is no parser for the old binary Word format and the
fallback produces control-character soup rather than text — this is why 199 of
the archived Lakeside reference plans could not be imported. Open any `.doc` in
Word and re-save it as `.docx` first.

## Most useful things to drop, in order

1. **The blank firm SOA template** — worth more than several completed ones. It
   carries the section structure and the fixed compliance wording with none of
   the client-specific noise.
2. **A completed SOA that replaces existing cover** — the most compliance-heavy
   case, and where a generator most easily goes wrong.
3. **A straightforward new-cover SOA.**
4. **One with cover held inside super**, ideally a self-employed or business client.
5. Blank templates for the client profile, fact find and risk report.

Three or four covering *different shapes* is far more useful than several
similar ones.

## What gets read out of them

- Section order, headings and numbering
- Fixed house wording that must be reproduced verbatim — general advice warning,
  duty to take reasonable care, cooling off, privacy, complaints and AFCA
- Legacy's licensee details: AR number, AFSL, ABN, address, phone
- The needs-analysis method — how cover is actually sized in this practice
- Table layouts for existing versus recommended cover
- Fee and commission disclosure format
- Tone and level of explanation

## Client data

These are real client documents. They stay on this machine, are read only to
derive structure and house wording, and are never used as content in another
client's advice — that rule is enforced in the generator's guardrails and
covered by tests.

Once processed, move a document into the folder it belongs in
(`../soa/`, `../client-profiles/`, and so on) or delete it.
