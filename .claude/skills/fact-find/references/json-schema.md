# Optional tooling: generate_fact_find.py

Only for the repo machine. The rules in `SKILL.md` apply whatever tooling is used.

## Run

```
python server/scripts/generate_fact_find.py <data.json> <out.docx> [--master <path>]
```

Default master: `legacy/drop/initial-meeting-build/fact-find/templates/Fact Find - master.docx` (gitignored, local only). It is a blanked real 2026 couple fact find, leak-scanned clean. If it is ever rebuilt from another client's fact find, leak-scan it with `server/scripts/leakscan_docx.py` for that client's names, address, phone, email, insurer and figures before use.

Data file: `legacy/file-notes/<slug>-ff.json`. Needs Python with `python-docx` (`pip install --user python-docx` if missing).

## JSON shape (every key optional)

Example names replaced with placeholders.

```
clients         ["[CLIENT_1_FIRST]", "[CLIENT_2_FIRST]"]     column headers (preferred names)
full_names      ["[CLIENT_1_FULL]", "[CLIENT_2_FULL]"]
date_completed  "22 October 2026"
why, story, planning_preferences, future_changes          text
goals           [[for, description, timeframe, amount, priority], ...]
personal, contact, employment, health, other_cashflow, estate
                [[label, client1, client2], ...]   ([label, client1] for a single client)
dependants      [[name, relationship, age, living at home, dependent], ...]
income, expenses, assets, liabilities   [[description, owner, amount], ...]
                a Total row is added from the amounts — do not add one
super           [[plan, policy #, owner, balance, life, tpd, ip, beneficiaries], ...]
insurance       [[description, owner, life insured, type, cover, premium], ...]
scope           text for "Scope of advice" (defaults to `why`)
scope_items     ["...", ...] for "Agreed scope of advice"
incomplete_info "None"   expertise "Yes"
not_applicable / not_disclosed   ["dependants", "super", ...] ticks the box
changes / additional   {"dependants": "text", ...}  "Any changes" / "Additional information" boxes
```

Text: `"\n"` splits paragraphs; a line starting `"- "` becomes a bullet.

## Known limits

| Limit | Effect | What to do |
|---|---|---|
| Totals parse only plain amounts (`$`, digits, commas, decimals) | Any "p.a.", "/m", "TBC", "Not disclosed" or "-" in an amount column silently removes that table's Total | Keep amount cells clean; list missing totals in the handover (default, Q-FF-4) |
| Totals add every row | Monthly and annual amounts in one table are added together | Every income and expense amount annual and gross (default, Q-FF-4) |
| Totals round to whole dollars | Cents lost | Write whole dollars |
| Adviser signatory skipped when it names Joshua Davidson | The master's adviser signatory is left as it is | Correct the adviser signatory to Tristan Biro by hand; say so in the handover (default, Q-FF-1) |
| Agreed scope always gets the fixed first bullet | `Review of your personal risk insurance needs: ` | Expected; it is kept (default, Q-FF-2) |
| No sections are removed | Unused sections stay with an empty row and unticked box | Tick the box for each untouched section |
| Bullets take their format from the Advice limitations box | If that box has no numbered paragraph, bullets render plain | Check the PDF |
| "Sample client:" scrub covers one text node only | A name in a separate run would survive | Read the output for any other client's details in the handover check (default, Q-FF-14) |
| Data file and .docx are overwritten on rebuild | Hand edits in Word are lost | Rebuild only before hand edits |
| Combined runner `prep-soa-case.ps1` dates the file with the run date unless `-Date` is passed | The run date is the house stamp (default, Q-FF-9) | Pass `-Date` only when Tristan asks for another date |
