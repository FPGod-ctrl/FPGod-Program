---
name: firm-rules
description: The rules every Legacy Risk Advice skill obeys. Client data, SharePoint read-only, no email, no invented facts, Legacy only, adviser's command, edits on the adviser's copy, Australian spelling, versioning.
metadata:
  version: 0.1.0-draft
  owner: Legacy Risk Advice
  updated: 27 Oct 2026
---

# Firm rules

Every skill obeys these rules. A skill may add rules. A skill may not relax one. If a rule and a request conflict, stop and ask Tristan.

Facts (names, numbers, paths) live in `firm-settings.md`. This file holds rules only.

---

## 1. Client data

1.1. Treat every client file as confidential. Read only what the task needs.

1.2. Never put client data in a skill, a rule file, a template, an example, a commit or a code comment. Use placeholders such as `[CLIENT_1]`, `[AMOUNT]`, `[POLICY_NO]`.

1.3. Nothing from the SharePoint library goes into git. Copies in the repo go only into gitignored folders (`legacy/soa/`, `legacy/drop/soa-build/cases/`, `legacy/file-notes/`, `legacy/advisers/`). Check `git status` shows none of them before any commit.

1.4. **Cloned documents carry other clients' data.** A firm SOA, fact find or notes file used as a base still holds its first client's name, DOB, figures, policy numbers and photos. It hides in:
- headers, footers, text boxes and nested tables;
- images in `word/media/` that no longer appear on any page (a removed paragraph leaves its image in the package unless its relationship is dropped);
- document properties (author, title, company) and comments;
- template leftovers such as a wrong first name or an Opex `Err:` block.

1.5. **Leak check every cloned or edited document before handover.** Run:

```
python server/scripts/leakscan_docx.py "<file.docx>" "<word1>" "<word2>" ...
```

The words are the clone base client's first names, surnames, DOBs, policy numbers, phone, email, street and suburb. Exit code 1 means a hit. Fix every hit and run it again. The script reads XML parts only, so also list `word/media/` and check every image is used and belongs to this client. Record the command (words replaced by a count) and the result in the review notes. [Q-SH-6]

1.6. If a document in a client's folder names a different client, do not read further. Flag it as possibly misfiled.

## 2. SharePoint is read only

2.1. The synced library (`LEGACY_LIBRARY_ROOT`) is the firm's live record. Any local write syncs firm-wide within minutes.

2.2. **Never** edit, save over, rename, move, delete or create anything inside it. Never change permissions, attributes or metadata. Not even when it looks harmless. Not even "with permission first".

2.3. Read and search are fine. To work on files, **copy them out first**, then work on the copy.

2.4. Copies go outward only. The library path is only ever the *source* argument of a copy.

2.5. Use `robocopy` when a plain copy fails (paths over 260 characters, OneDrive placeholders). Library path first, destination second. Never use `/MIR`, `/PURGE`, `/MOV`, `/MOVE` or `/M` (it resets the source's archive flag). Write any log into the destination, never the source.

2.6. Files are OneDrive "Files On-Demand" placeholders. Reading one downloads it, so bulk reads are slow and can fail. Do not change a file's "always keep on this device" setting. If a file will not download, list it as not read and move on.

2.7. Anything a skill produces is written outside the library. Tristan or Howard moves it into SharePoint by hand if it belongs there.

## 3. Never write beside the source

3.1. Never run a tool that writes output next to its inputs (an `.extracted/` folder, converted copies, logs) against the library. This happened once (18 Sep 2026): an extractor made 17 text files inside a client folder.

3.2. Before pointing any script at client files, check where it writes. Give it an explicit output folder outside the library.

3.3. Keep the copied folder clean too. Put extracted text, conversions and build scripts in sibling folders, not inside the copy.

## 4. No email, no Outlook

4.1. Do not open, read, scan, search, draft or send email in any way. Do not start Outlook. Do not read the inbox, sent items or calendar. Do not write email text meant to be sent.

4.2. Do not restore or run the firm's archived email code. Do not add any mail-sending path or permission to any tool.

4.3. If a task genuinely needs email, say so and let the adviser do it.

4.4. Saved email files (`.msg`) inside a client's case folder: see [Q-IN-1]. Until answered, list them by file name only and do not open them.

4.5. A tool hook refuses file writes that mention mail programs, mail links or the archived email scripts. Describe the rule in plain words. Do not quote those names.

## 5. Never invent facts

5.1. Every fact in an output comes from a named source: the transcript, a file in the case folder, XPLAN, or the adviser's words in chat.

5.2. If a fact is missing, write `[ADVISER TO CONFIRM]` (one spelling only; see firm-settings §11 and [Q-SH-3]). Never guess a DOB, premium, sum insured, policy number, income, occupation or reason.

5.3. If two sources disagree, do not pick one silently. Use the more authoritative one (the decision rules in each skill say which) and list the conflict in the review notes.

5.4. List every placeholder left in an output in its review notes.

## 6. Legacy only

6.1. All work is for Legacy Risk Advice, an AR of Synchron Advice Pty Ltd (firm-settings §1–2).

6.2. Never use the previous practice's name, branding, letterhead, licensee, AFSL or AR numbers. Never use material from the archived previous-practice folder as a base, an example or a source of wording.

6.3. If a document or template carries another licensee's details, stop and flag it. Issuing advice under another licensee's AFSL is a compliance breach, and it reads as correct at a glance.

6.4. Logins (XPLAN, insurer portals, Microsoft 365) must be the Legacy account. If two accounts exist on the machine, ask which one.

## 7. Only on the adviser's command

7.1. Write an SOA (`build-soa`) or build a pack (`build-pack`) only when the adviser asks for that client in so many words ("build the SOA for X", "build the pack for X").

7.2. Finishing one stage never starts the next. Report and wait.

7.3. Ask before any step that is not undoable or that leaves the machine (DocuSign drafts, XPLAN writes, installing software). [Q-IN-11]

## 8. Edit on top of the adviser's copy

8.1. Once the adviser has edited a document himself, his copy is the master.

8.2. Apply further changes **on top of his edited copy**. Never regenerate the document and overwrite it.

8.3. Keep his file untouched. Save the result as a new file and say what changed.

8.4. Firm documents that go into a pack (SOA, Fact Find, application summaries, FSG) are copied byte for byte, never regenerated or re-exported. The `build-pack` skill has the detail.

## 9. Australian English and money

9.1. Australian spelling: adviser, organisation, recognise, licence (noun), license (verb), cheque, program.

9.2. Money is AUD. Write `$1,234.56` or whole dollars where the house document does. Say per month or per annum every time.

9.3. Dates as in firm-settings §9. Never US date order.

9.4. Plain short sentences in anything Claude writes for the team.

## 10. Versioning

10.1. Every skill and rule file has a version in its front matter (`0.1.0-draft` now).

10.2. Every output's review notes (READ ME, review list, inventory) end with a line like:

```
Produced with <skill> <version>, firm-rules <version>, firm-settings <version>, on <d MMMM yyyy>.
```

10.3. A change to a skill or rule goes in `skills-draft/CHANGELOG.md` with its new version.

10.4. Questions for Tristan live in `skills-draft/_questions/`. A skill tags an unsettled point `[Q-SH-n]` (shared) or `[Q-<skill>-n]`. When answered, update the skill, remove the tag and record it in the CHANGELOG.
