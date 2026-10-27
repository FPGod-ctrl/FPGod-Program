# Changelog

All changes to the Legacy Risk Advice skill pack. Newest first. Versions follow the scheme in `README.md`.

## 1.0.0 — 27 October 2026

Released and installed as the live Claude Code skills, at Tristan's request ("install as live skills").

- All eight skills and both shared files finalised on each question's default. Every default is tagged `(default, Q-xx-n)` in the text so a later answer can find it.
- Q-SH-1 answered: Sub-AR 1313019 confirmed by Tristan, 27 Oct 2026. Contact details still on the default.
- Two points have no safe default and stop to ask Tristan: Q-PK-1 (DocuSign countersigner) and Q-CVC-2 (Yearly Saving when the two policies are billed at different frequencies).
- Installed at `.claude/skills/`, replacing the three earlier project skills (`meeting-notes`, `build-soa`, `build-pack`; still in git history at commit 5947d63). `meeting-notes` now runs `fact-find` and `soa-notes` after it, so pasting a transcript still produces all three Stage 1 to 3 documents.
- New skills: `case-folder-intake`, `fact-find`, `soa-notes`, `cvc-summary`, `application-details`.
- Changes from earlier practice to be aware of: meeting notes read the client's SharePoint file only when Tristan names it (Q-MN-5, Q-FF-12); the leak check runs on every document cloned from another client's document (Q-SH-6); `[ADVISER TO CONFIRM]` is the one placeholder, with `TBC` kept for missing client facts in meeting notes and fact finds (Q-SH-3).

Answers Tristan gives later become 1.1.x releases.

## 0.1.0-draft — 27 October 2026

First draft, written from `FPGOD-SYSTEM-SPEC.md` (27 Oct 2026), `server/src/config/env.js`, `server/src/data/legacy-practice.json`, `server/src/services/workbench/paths.js`, `server/scripts/leakscan_docx.py`, `legacy/advisers/README.md` and Tristan's Claude memory notes. No client data used.

Added:

- `_shared/firm-settings.md` 0.1.0-draft: firm, licensee, advisers, team, insurers, referral partners and fees, FSG versions, SharePoint folder layout, naming conventions, local settings, placeholder spelling.
- `_shared/firm-rules.md` 0.1.0-draft: client data and leak checks, SharePoint read only, no output beside a source, no email, never invent facts, Legacy only, adviser's command, edit on the adviser's copy, Australian English and AUD, versioning.
- `case-folder-intake/` 0.1.0-draft: `SKILL.md` plus `references/extraction-methods.md`, `inconsistency-checks.md`, `inventory-template.md`.
- `_questions/shared.md` (Q-SH-1 to Q-SH-14) and `_questions/case-folder-intake.md` (Q-IN-1 to Q-IN-13).
- `README.md`.

Not yet drafted: `meeting-notes`, `fact-find`, `soa-notes`, `build-soa`, `application-details`, `cvc-summary`, `build-pack`. The live project skills in `.claude/skills/` are unchanged.
