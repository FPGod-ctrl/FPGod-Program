# Legacy Risk Advice

Everything belonging to the current practice. Risk insurance only — life, TPD,
trauma and income protection.

The previous practice's material is archived under [`archive/lakeside/`](../archive/lakeside/)
and is reference only. Nothing there is loaded by the running program, and no
client detail, letterhead or licensee detail from it may appear in a document
produced here.

## Folders

| Folder | What goes in it |
|--------|-----------------|
| `drop/` | **Inbox.** Put Word documents here for Claude to read — sample SOAs, blank firm templates, anything that defines the house standard. |
| `templates/` | The firm's approved blank Word templates, once identified. These drive the clone-and-fill generators. |
| `soa/` | Statements of Advice produced for clients. |
| `client-profiles/` | Client information & consent profiles. |
| `fact-finds/` | Completed fact finds. |
| `risk-reports/` | Current / indicative cover summaries. |
| `file-notes/` | Meeting and phone-call file notes. |

## Where the app stores things

Documents generated through the app are written to the database and to
`server/uploads/`, not to these folders. These are for your own working files
and for anything you want Claude to read or produce directly.

## Firm identity

Set in `server/.env` as `FIRM_NAME` (currently `Legacy Risk Advice`). The
generators are told this explicitly so they never reproduce the previous
practice's sign-off from the reference material.

Licensee details — Authorised Representative number, AFSL, ABN, address, phone —
are **not yet configured**. Every generated document currently prints
`[ADVISOR TO CONFIRM]` in their place. Supply them and they can be filled in
automatically.
