# Legacy Risk Advice skill pack (DRAFT)

Version **0.1.0-draft**, 27 October 2026. Owner: Legacy Risk Advice. Approver: Tristan Biro.

## What this is

A set of Claude skills for Legacy Risk Advice, a risk-only advice practice (life, TPD, trauma, income protection) and corporate AR of Synchron Advice. The skills take a client from first meeting to a send-ready SOA pack. They are shared with the team and versioned.

Everything here is a **draft**. Anything not yet settled is a numbered question for Tristan in `_questions/`. Nothing becomes 1.0.0 until he has answered.

The pack was drafted from `FPGOD-SYSTEM-SPEC.md` (27 Oct 2026), which describes the system as it was then. It holds no client data. Keep it that way.

## Layout

```
skills-draft/
  README.md              this file
  CHANGELOG.md           every version and what changed
  _shared/
    firm-settings.md     the facts every skill uses (firm, licensee, advisers, insurers, folders, names)
    firm-rules.md        the rules every skill obeys
  _questions/
    shared.md            questions about the shared files (Q-SH-n)
    <skill>.md           questions per skill (e.g. Q-IN-n for case-folder-intake)
  <skill>/
    SKILL.md             the skill
    references/          detail the skill loads when needed
```

## The skills, in pipeline order

| # | Skill | What it does | Started by | Status |
|---|---|---|---|---|
| 1 | `meeting-notes` | From a meeting transcript, writes the Initial Meeting Notes (client details summary). | Adviser pastes a transcript | Live as a project skill; to be ported |
| 2 | `fact-find` | Fills the firm's Fact Find from the transcript and notes. Wording mirrors the SOA scope. | After 1, or "do the fact find" | To be split out of `meeting-notes` |
| 3 | `soa-notes` | Writes the SOA Notes: the adviser's strategy and reasons, as a brief for the paraplanner. | After 2, or "prep the SOA" | To be split out of `meeting-notes` |
| — | *(manual)* | Howard files quotes, research, Risk Checklist and cover summary in the SharePoint client folder. | — | — |
| 4 | `case-folder-intake` | Copies the client's SharePoint folder out read only, reads every document, and lists inconsistencies. | Before 5–8, or "read X's folder" | **Drafted, 0.1.0-draft** |
| 5 | `build-soa` | Writes the Statement of Advice by cloning a same-adviser firm SOA and filling it from the case folder. | Only on "build the SOA for X" | Live as a project skill; to be ported |
| 6 | `application-details` | Prepares an application details sheet (couple side by side, plus a check-before-lodging list). | "prepare X for an application" | Memory job; to be written |
| 7 | `cvc-summary` | Fills the `CvC ` sheet of the Insurance Cover Summary: the FINAL Insurance Summary per life insured. | "CvC" | Memory job; to be written |
| 8 | `build-pack` | Assembles the send-ready DocuSign SOA pack. Firm documents are copied unchanged. | Only on "build the pack for X" | Live as a project skill; to be ported |

Each skill reads `_shared/firm-rules.md` and `_shared/firm-settings.md` first.

## Installing

### Claude Code

1. Copy each skill folder you want into `.claude/skills/` (project) or `~/.claude/skills/` (personal):
   ```
   .claude/skills/case-folder-intake/SKILL.md
   .claude/skills/case-folder-intake/references/...
   ```
2. Copy `_shared/` to `.claude/skills/_shared/` so the skills' `../_shared/` links resolve. It has no `SKILL.md`, so it is not loaded as a skill.
3. Set your own local settings (`firm-settings.md` §10), at least `LEGACY_LIBRARY_ROOT`. [Q-SH-4]
4. Do not overwrite the live `meeting-notes`, `build-soa` or `build-pack` project skills with drafts. Ask Tristan first.
5. Start a new session. The skill appears in the skill list and triggers on the phrases in its description.

### Another Claude product (Claude apps, Claude Desktop, API)

Those products load each skill as a self-contained folder, so `../_shared/` links will not resolve.

1. Make a copy of the skill folder.
2. Copy `firm-rules.md` and `firm-settings.md` into its `references/`, and change `../_shared/` to `references/` in `SKILL.md`.
3. Zip the folder and upload it with that product's skill upload.
4. Skills that read SharePoint or run local tools (intake, build-soa, build-pack) need a machine with the library synced. They will not work in a browser-only product.

## Versioning

- Semantic versions. Every skill and shared file carries its own version in its front matter. The pack version is in `CHANGELOG.md`.
- `0.1.0-draft`: first draft from the spec.
- `0.x.y-draft`: Tristan's answers folded in. MINOR for a new skill or section, PATCH for wording.
- `1.0.0`: every question marked "No default — must answer" is answered and Tristan signs off.
- After 1.0.0: MAJOR when a rule change changes what a skill outputs, MINOR for new behaviour, PATCH for fixes.
- Every change gets a CHANGELOG entry: version, date, what changed, which questions it answered.
- Every output records the versions it was made with (firm-rules §10.2).

## Answering questions

1. Open the file in `_questions/` (`shared.md` first).
2. Each question has **Why it matters** and **Default if you don't answer**. Type your answer under **Your answer:**. "Default is fine" is a valid answer.
3. Most important questions are first. Answer those even if you leave the rest.
4. Tell Claude "the answers are in". Claude folds each answer into the skill or shared file, removes the `[Q-..-n]` tag, notes "Answered in <version>" under the question, and adds a CHANGELOG entry.
5. Unanswered questions keep their default.

## Rules that never change without Tristan

- SharePoint is read only.
- No email or Outlook in any form.
- No client data in this pack.
- Legacy Risk Advice only. Never the previous practice's details.
- SOA and pack only on the adviser's command.

The full list is in `_shared/firm-rules.md`.
