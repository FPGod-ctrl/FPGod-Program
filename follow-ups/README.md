# Follow-up emails

Client follow-up **emails** (plain text/markdown) — kept in their own area,
**separate from all other template and generator machinery**:

- NOT in `templates/` (that folder is for `.docx` clone-and-fill templates —
  Client Profile, Insurance Report — and their data templates).
- NOT in `server/scripts/` (the generators).
- NOT in `generated-profiles/` or `generated-plans/` (generator output).

These are written emails, so they have no docx template and no generator script.
Everything follow-up lives here and only here.

## Two separate types — do not mix

| Folder | Use |
|--------|-----|
| [`phone-call/`](phone-call/) | Follow-up email **after a phone call** (initial/outreach call). |
| [`meeting/`](meeting/) | Follow-up email **after a meeting** (post-appointment). |

Each folder holds:
- `_template.md` — the approved format for that type.
- Saved drafts for individual clients (e.g. `phone-call/Nicholas-Christie.md`),
  named by client. Keep phone-call drafts in `phone-call/`, meeting drafts in
  `meeting/` — never cross-file.

Firm: Lakeside Financial · licensee Pareto Group Pty Ltd (AFSL 418700) ·
adviser Tristan Biro (AR 001313019).
