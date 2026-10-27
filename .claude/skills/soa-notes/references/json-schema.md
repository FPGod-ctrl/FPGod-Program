# Optional tooling: build_soa_notes.py

Only for the repo machine. The rules in `SKILL.md` apply whatever tooling is used.

## Run

```
python server/scripts/build_soa_notes.py <notes.json> <out.docx>
```

Data file: `legacy/file-notes/<slug>-soa-notes.json`. Needs Python with `python-docx`.

## JSON shape

Example names replaced with placeholders.

```
brief         "Hey Howard,\n\n..."                     the covering instructions
to_obtain     ["Quotes: ...", ...]                      documents to obtain (☐ checklist)
outstanding   ["[CLIENT_1]'s DOB", ...]                 still to confirm with the client (☐ checklist)
circumstances "Incomes -\n..."                          the shorthand under "Financial circumstances"
title         "Statement of Advice Notes - [CLIENT_1] and [CLIENT_2]"
sections      [{"heading": "Goals", "body": "- ..."}, ...]
```

Body text: `"\n"` splits paragraphs, `"- "` is a bullet, `"  - "` a sub-bullet. `TBC` and `[ADVISER TO CONFIRM...]` are highlighted yellow. This document uses `[ADVISER TO CONFIRM]` for every gap in the body (default, Q-SH-3).

## Layout the builder produces

Calibri 11. Brief paragraphs; bold "Documents to obtain" with ☐ items; bold "Still to confirm with the client" with ☐ items; navy "Financial circumstances" heading and shorthand (only if `circumstances` is given); navy title (default "Statement of Advice Notes"); one navy heading per section, in the order given.

## Known limits

| Limit | What to do |
|---|---|
| Section order is whatever the JSON gives | Always give the six sections in the fixed order (default, Q-SN-2) |
| Only `[ADVISER TO CONFIRM...]` is highlighted, not `[ADVISOR ...]` | Spell it ADVISER |
| An empty `to_obtain` or `outstanding` list drops that heading | Expected |
| PDF export (Word) can hang | Ship the `.docx`; report the warning |
