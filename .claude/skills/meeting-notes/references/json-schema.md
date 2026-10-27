# Optional tooling: generate-client-details-summary.mjs

Only for the repo machine. The document rules in `SKILL.md` apply whatever tooling is used.

## Run

```
cd server
node scripts/generate-client-details-summary.mjs <data.json> "<out.docx>"
```

The template is `legacy/drop/initial-meeting-build/client-details-summary/templates/Initial meeting notes.docx` (gitignored, local only). The data file goes in `legacy/file-notes/<slug>-cds.json`, slug `<first-last>-<monDD>` in lower case.

The combined runner `server/scripts/prep-soa-case.ps1` builds this document together with the fact find and SOA Notes (the Stage 1-3 run in `SKILL.md`). It needs all three JSON files with the same slug. To build this document alone, call the generator directly, writing the output into the case folder's `2. Compliance docs (SOA, ROA, EO & Fact Find)/`.

## JSON shape

```json
{
  "clientName": "[CLIENT_1_FIRST] [CLIENT_1_LAST] OCT22",
  "sections": [
    { "label": "Name", "value": "[CLIENT_1_FIRST] [CLIENT_1_LAST]" },
    { "label": "Referred from", "value": "[REFERRER]" },
    { "label": "About the client", "value": "Line one.\nLine two." }
  ]
}
```

- `"\n"` in a value starts a new paragraph.
- Any whole word `TBC` is highlighted yellow.
- Labels are matched **in document order**: the Nth occurrence of a label in the template takes the Nth entry for it. Never reorder.

## Label order the app uses

As found in the app. It has not been checked against the template, so check the built header and sections by eye after every build (default, Q-MN-3).

Single: Name, Mobile, Sex, Referred from, About the client, What is important to you, Reasons for seeking advice, Current Insurance, Financial circumstances, Family, Super, Estate Planning, Health, Height, Hobbies, UNDERWRITING, Insurance needs, Goals, About the client (2nd), Reasons for seeking advice (2nd), Existing cover, Estate Planning (2nd), Super (2nd), Outcome of meeting.

Couple: Name, Mobile, Sex, Spouse Details, Name, Mobile, Sex, then the single list from Referred from.

## Known limits (finish by hand)

| Limit | Effect | What to do |
|---|---|---|
| Never deletes a template label | Every section you drop leaves its heading behind | Delete unused headings in Word before handover (default, Q-MN-1) |
| Sequential matching | A label not found in the template stops every later label filling. The CLI prints `NOT MATCHED`; check for it. | Fix the label and rebuild |
| Short-label prefix match | `Name` or `Sex` can match any later paragraph starting with those letters | Check the header block after building |
| Header values insert as a new paragraph after the whole header line | Value may not sit beside its label | Move each value beside its label by hand; check by eye (default, Q-MN-3) |
| Spouse Details insertion point | Assumed to be in the template | If it is missing, add it by hand, formatted like the client block (default, Q-MN-4) |
| No italics, no bold in values | | Format by hand if needed |
| PDF export (Word) sometimes hangs | | Ship the `.docx`; report the warning |
