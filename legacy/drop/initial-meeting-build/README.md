# Task: initial meeting — transcript into the two house documents

One transcript in, **two documents** out:

1. **Client Details Summary** — "initial meeting notes". The record of the
   meeting itself.
2. **Fact find** — the client's full circumstances, captured on the house form.

Both are written from the same initial meeting, so they are built as one task.

## House style — derived from Tristan's edit of a generated draft

`client-details-summary/examples/Verinder-Rai-SEP02-EDITED-BY-TRISTAN.md` is the
generated draft **after he edited it**. The diff between draft and issued document
is the real specification. Rules taken from it:

1. **Never write about the transcript.** Cut "rendered as Linkify", "came through
   unclearly", "figure unclear on the call", "[CONFIRM spelling]" scattered through
   prose. Either state the fact, or list it as outstanding. He deleted every one of
   these. "Insurer unclear on the call -" is as far as it goes.

2. **Do not editorialise on significance.** He cut "significant given a young family
   and an SMSF holding a geared property", "particularly important here...", "and the
   clearest reason the existing $500,000 is inadequate". State the fact and stop —
   he draws the conclusion himself.

3. **Flag outstanding items by highlighting, sparingly.** In his document only four
   things were yellow-highlighted: the two surname spellings, Maneep's smoker status,
   and height/weight. Everything else he either filled in or left as plain text. Do
   not pepper the document with `[CONFIRM]`.

4. **He fills the header fields himself** from his own records — mobile, email,
   confirmed address. Leave them blank-but-labelled rather than annotated. Formats he
   used: DOB `19/11/1989`; Smoker `Lifelong non-smoker`; Speciality is the job title
   (`Facility Manager`); Employer/self is one word (`Employer`).

5. **Resolve a range to one figure where the client effectively gave one.** He changed
   "approx. $730,000-$740,000" to "approx. $740,000". Ranges survive only where
   genuinely uncertain ($90,000-$100,000 savings, $30,000-$40,000 SMSF cash).

6. **The repeated second block is trimmed to two sections** — "About the client." and
   "Reasons for seeking advice". He deleted the repeated Existing cover, Estate
   Planning and Super.

7. **"Outcome of meeting" is dropped when no advice was given.** On an initial
   enquiry call he removed the whole section, including the adviser/client action
   lists. Keep those for a meeting that actually decided something (see the Gary
   AUG03 review, where they were the point of the document).

8. **End with `OUTSTANDING - TO BE OBTAINED`.** He kept this in full, unedited. It is
   the part of the document that earns its keep.

9. **Small wording tell:** "life plus TPD and income protection" became "life plus TPD
   and income protection **as a minimum**". He leaves the door open on scope.

Net effect: **the draft is too wordy and too self-referential.** Aim shorter, more
declarative, and keep the reasoning out of it.

## Where things go

| Folder | What goes in it | Status |
|--------|-----------------|--------|
| `client-details-summary/templates/` | The **blank** Client Details Summary template. | Waiting |
| `client-details-summary/examples/` | **Completed** Client Details Summaries from real meetings. | Coming later |
| `fact-find/templates/` | The **blank** fact find form. | **Incoming — use this** |
| `fact-find/examples/` | **Completed** fact finds for real clients. | Coming later |
| `source-transcripts/` | The meeting transcripts / raw notes both documents were written **from**. | **None matching — do not chase** |

### No matched transcripts — work from live ones instead

Tristan has no transcript that matches an existing Client Details Summary or
fact find (confirmed 2026-09-01). **Do not chase them.** The build works from
the completed documents for structure and house wording, and the transformation
gets tuned against real transcripts as meetings come through.

Practically this means the first few runs are calibration: generate from a live
transcript, compare against how he would have written it, and adjust. Expect
the "what gets added that was never said out loud" part — the judgement a real
adviser applies — to need his correction rather than being inferable up front.

Examples covering **different client shapes** (single vs couple, employee vs
self-employed, existing cover vs none) are worth more than volume.

## The fact find template is being supplied — use it directly

Tristan is providing the **blank** fact find form (2026-09-01). Use it as the
clone-and-fill master. This supersedes the fallback below and is the better
option: a supplied blank carries no client data, so there is nothing to strip
and no risk of a stray value propagating into future fact finds.

His examples are all on the current Legacy form, so there is no
previous-licensee branding in play — unlike the archived Lakeside material,
which must never appear on a Legacy document (see commit `c879ef4`).

<details>
<summary>Fallback if the blank is ever unavailable</summary>

A form's blank is recoverable from completed copies: every copy shares identical
labels, section order and fixed wording, and only the client data varies. Take
one completed `.docx` and clear the client-specific cells — clone-and-fill
already operates on the document XML, so blanking a filled form is the same
operation in reverse.

**Required safeguard for that route.** Every client value must be stripped *and
verified stripped* — one value left in a cell propagates silently into every
future client's fact find. Blank programmatically, then scan for residual names,
dates, dollar figures and policy numbers. Do not rely on visual inspection.
</details>

## Decisions (2026-09-01, confirmed by Tristan)

- **Output is a Word document** — a `.docx` into the client file, like the
  client profile and insurance report generators produce.
- **One format each**, with sections included only when relevant.
- **Initial and review meetings use the same document** (confirmed 2026-09-01). In
  a risk-only practice they are usually one and the same — a review captures the
  same circumstances an initial meeting does. Do **not** build a review variant,
  add a meeting-type field, or branch the generator. Fields that read as
  initial-only ("Referred from", "About the client") simply carry review-context
  content. Verified against the Gary AUG03 transcript, which is a review meeting
  and fills the template unmodified.
- **Tristan writes these today; a VA takes them over once built.** That makes
  them the **first VA-assigned task type**, and so the first real case for the
  assignment/tracking model in
  [`../../va-workflow-build-brief.md`](../../va-workflow-build-brief.md).

## The fact find is not only a document

A Client Details Summary is prose — it is read by people. A fact find is
**structured data**: income, expenses, assets, liabilities, family, existing
cover. The app already has a table for every one of those, and
`gatherClientContext()` already reads them back out.

So generating a fact find from a transcript should do two things:

1. Produce the `.docx` on the house form, and
2. **Write the extracted detail into the client file** — `family_members`,
   `income_sources`, `expenses`, `assets`, `liabilities`,
   `insurance_policies`.

That second half is what makes the rest of the workflow pay off: the SOA brief
pack is assembled from exactly those tables, so a fact find done at the initial
meeting populates the pack automatically instead of being re-keyed later. It
also means the fact find that `soa-build/fact-finds/` currently expects as a
manual input becomes something this app produces.

Confirm the mapping against a real completed fact find before relying on it —
field names and how the form asks a question are read out of the template.

## Which .docx path each uses depends on its template

The repo has both, and the choice is made by looking at the template:

| Template shape | Path | Why |
|---|---|---|
| A **form** — labelled table rows and cells | **Clone-and-fill** (`JSZip`, as in `server/scripts/generate-client-profile.mjs`) | Opens the real `.docx` and rewrites cell text in place, so letterhead, fonts and brand colours survive byte-for-byte. `setCellText()` already splits on newlines, so a large free-text cell works fine. |
| **Prose under headings**, variable length | Build from `html-to-docx` / `docx` | Free-flowing content has no fixed cell to land in. |

A fact find is almost certainly a form, so clone-and-fill should suit it — the
client profile generator is the closest working model and its ledger/label
matching logic is directly reusable. The Client Details Summary may go either
way.

## Not the same thing as the follow-up email

The repo already generates a client-facing follow-up email from a transcript
(`server/src/services/emailGenerator.js`). These are different documents:
third-person and factual for the file, versus warm and second person to the
client. Same input, separate generators — do not merge them.

## Formats

`.docx`, `.pdf`, `.md` and `.txt` extract cleanly. `.doc` does **not** — open it
in Word and re-save as `.docx` first. See [`../README.md`](../README.md).

## Client data

Real client material. It stays on this machine, is read only to derive structure
and house wording, and is never used as content in another client's documents.
Everything in this folder except the READMEs is gitignored.
