# Task: initial meeting — transcript into the two house documents

One transcript in, **two documents** out:

1. **Client Details Summary** — "initial meeting notes". The record of the
   meeting itself.
2. **Fact find** — the client's full circumstances, captured on the house form.

Both are written from the same initial meeting, so they are built as one task.

## House style — derived from Tristan's edits of generated drafts

Three examples, each a generated draft **after he edited it**. The diff between draft and
issued document is the real specification.

| Example | Shape | Status |
|---|---|---|
| `client-details-summary/examples/[couple-A]-SEP14-EDITED-BY-TRISTAN.md` | Couple; first-contact referral call, no cover details known | **Current — follow this** (2026-09-14) |
| `client-details-summary/examples/[couple-B]-SEP10-EDITED-BY-TRISTAN.md` | Couple; adviser already held the client's details | Superseded where it disagrees with SEP14 |
| `client-details-summary/examples/[single-C]-SEP02-EDITED-BY-TRISTAN.md` | Single client, first-contact enquiry, most basics unknown | Superseded where the others disagree |

The SEP10 and SEP14 files each carry a full annotated diff. Rules below are the SEP10 set;
**read the SEP14 rules further down first — they take precedence where they overlap.**

1. **Never write about the transcript.** Cut "came through unclearly", "figure unclear on
   the call", "[CONFIRM spelling]" scattered through prose. Either state the fact, or mark
   the field `TBC`. This also killed in-prose flags like "stated as X and recorded as Y",
   "spelled verbally and is to be confirmed", "fund not known; to be confirmed" and
   "NOT CAPTURED" appended to a sentence. A `NOT KNOWN` **inside a structured cover
   listing survives** — that is data about a policy, not a note to self.

2. **Do not editorialise on significance.** State the fact and stop — he draws the
   conclusion himself.

3. **Outstanding items are `TBC`, highlighted, in the field they belong to.** Not a
   sentence, not a closing list. Fill everything that is known first — he fills DOB,
   mobile, email, postcode, smoker status and the spouse's details from the client file —
   then highlight the residue. Fall back to a closing `OUTSTANDING - TO BE OBTAINED` list
   only when the gaps are too many or too large to sit in a field, as on a first-contact
   enquiry where nothing is yet known (the SEP02 example). **On a normal meeting there is
   no closing list.**

4. **Header field formats:**

   | Field | Format |
   |---|---|
   | `DOB` | `dd/mm/yyyy` |
   | `Address` | street, then **suburb uppercase**, state, postcode — no commas |
   | `Smoker` | `N` or `Y` |
   | `Speciality` | industry, en dash, job title — `IT – Solutions Analyst` (illustrative) |
   | `Employer/self` | employment basis **and income** — `PAYG $000,000 + Super` |

5. **For a couple, add a `Spouse Details` header block** immediately under the client's,
   identically formatted, carrying the same nine fields. It is not in the blank template.
   When present, **delete the `Family / partner/ dependants:` heading** — the partner is
   header data, and the children survive as one or two italicised lines under `Income` in
   the financial section, with no heading of their own.

6. **Resolve a range to one figure where the client effectively gave one.** Ranges survive
   only where genuinely uncertain.

7. **`What is important to you` records what the money must DO, not what the client
   asked.** Education delivered in the meeting — trauma versus TPD, stepped versus level,
   how a rollover premium is paid — is not file-note content and gets deleted wholesale.
   Write purpose-per-cover instead, short and declarative: "Wants to clear total debt in a
   claimable Life event." / "TPD to clear home debt and provide excess monies post tax to
   fund house modifications or medical expenses." **This is the section that justifies the
   sums insured.**

8. **Strategy, structure and pricing come OUT.** The Client Details Summary records the
   client's **circumstances**. Indicative sums insured, premium figures, the funding split
   between super and cash flow, stepped-versus-level, the 15% rollover rebate, the
   deductibility argument, the 70%-of-income basis — all belong in the Statement of Advice
   and were deleted in full. Anything reading like an argument for a course of action is
   cut. Same for the intestacy explanation under Estate Planning, which reduces to one
   line, and the "outside the practice's authorisation" disclaimer.

9. **`Insurance needs` is repurposed as `UNDERWRITING`.** What survives is only what an
   underwriter needs: condition, medication and dose, when diagnosed, whether controlled,
   and the occupation rating still to be established. Nothing about sums insured.

10. **The document ends at `Goals`.** Delete the repeated second block outright — including
    the second `About the client.` and `Reasons for seeking advice`, not merely the
    repeated Existing cover / Estate Planning / Super.

11. **`Outcome of meeting` is dropped whenever no advice was given** — even where the
    meeting agreed concrete next steps. Adviser/client action lists and the
    service-and-remuneration explanation are not file-note content. Keep the section only
    for a meeting that decided something advice-bearing (see the Gary AUG03 review, where
    it was the point of the document).

12. **Compression device:** `Same as <spouse>.` appended where the spouse's position mirrors
    the client's, instead of repeating the detail.

13. **Small wording tell:** "life plus TPD and income protection" became "life plus TPD and
    income protection **as a minimum**". He leaves the door open on scope.

Net effect: **the draft is too wordy, too self-referential, and strays into advice.** Aim
shorter and more declarative, keep the reasoning out, and stop at the client's circumstances.

### SEP14 edit — these override the above where they overlap

From `client-details-summary/examples/[couple-A]-SEP14-EDITED-BY-TRISTAN.md`
(2026-09-14). The draft was close — his words were "not many changes" — so these are the
residue, and they are the sharpest signal available.

14. **Never assert a negative as fact; record it as not disclosed.** "No investment
    properties, shares, managed funds, cash or savings **are held**" became "**have been
    disclosed**", and the same in the assets list. The client saying he holds nothing is
    not evidence that he holds nothing. Every absence in the document is an absence *of
    disclosure*.

15. **Qualify the standing cover clause when no cover is confirmed.** "EXISTING COVER
    REMAINS IN FORCE" becomes "**EXISTING COVER (IF ANY) REMAINS IN FORCE**" where nothing
    has yet been confirmed to exist.

16. **Financial circumstances does not repeat the header or About the client.** The whole
    `Income` block and the dependants line were deleted — both incomes already sit on the
    `Employer/self` header lines and the children are already in *About the client*. This
    **replaces SEP10 rules 4 and 8**, which moved the children into this section. It now
    reduces to: ASSETS, total, LIABILITIES, total, `Estimated net position approx. $X.`,
    then any `NOT CAPTURED` line and the one-line driver sentence.

17. **Delete any section with nothing real in it — `Goals` and `UNDERWRITING` included.**
    SEP14 **ends at `Height / weight`**: `Hobbies / pets`, `UNDERWRITING`, `Insurance
    needs`, `Goals` and the trailing repeated block all went. This **replaces SEP10 rule
    10** ("the document ends at Goals") — SEP10 ended at Goals because that meeting had
    goals. The test is **would this section exist if the draft could only use facts?** A
    heading is not a reason to synthesise content, and a first-contact call usually has
    nothing to underwrite and no goals yet explored.

18. **A `TBC` field can carry a qualifying line** where something partial is known —
    "Both to be explored further however, client has disclosed [a healthy] BMI for each."

19. **A long `Employer/self` value moves to its own line**, leaving `Sex` and `Speciality`
    on the row above. Short values keep all three on one line.

20. **Name the school type where fees are in play** — "one child still at school" became
    "one child still at **private** school".

21. **"No binding death benefit nominations discussed." stays out of `Super`.** He cut the
    same line from SEP10 and it came back in the SEP14 draft. It is a note about what the
    meeting did not cover, which rule 1 already forbids — the recurrence is the point.

22. **Stray empty labels are tolerated; invented content is not.** He left the empty
    `Family / partner/ dependants:` heading standing and spent his edits on deleting
    inferred prose instead. Do not pad a section to justify its heading.

### Generator gaps against this spec

`server/scripts/generate-client-details-summary.mjs` cannot yet produce three things the
SEP10 document needs, so they are hand-finished:

- **Yellow highlighting** for `TBC` — `contentParas()` emits plain runs with no `rPr`.
- **The `Spouse Details` header block** — it has no insertion point in the template.
- **Deleting unfilled labels** — it only inserts after a label, so every dropped section
  (`Family / partner/ dependants`, the repeated second block, `Outcome of meeting`) leaves
  a stray heading behind for him to delete by hand.

## Where things go

| Folder | What goes in it | Status |
|--------|-----------------|--------|
| `client-details-summary/templates/` | The **blank** Client Details Summary template. | Waiting |
| `client-details-summary/examples/` | **Completed** Client Details Summaries from real meetings. | **Two, both edited by Tristan — SEP10 is current** |
| `fact-find/templates/` | `Fact Find - master.docx`: a blanked real 2026 couple fact find (the firm's "Fact Find Template.docx" is a 2023 Rasel Ahmed one on the older, shorter form). Filled by `server/scripts/generate_fact_find.py`; the whole pipeline is the `/meeting-notes` skill. | **In use (2026-10-22)** |
| `fact-find/examples/` | **Completed** fact finds for real clients. | Coming later |
| `source-transcripts/` | The meeting transcripts / raw notes both documents were written **from**. | **None matching — do not chase** |

### No matched transcripts — work from live ones instead

Tristan has no *pre-existing* transcript that matches an existing Client Details
Summary or fact find (confirmed 2026-09-01). **Do not chase them.** The build
works from the completed documents for structure and house wording, and the
transformation gets tuned against real transcripts as meetings come through.

**Matched pairs now exist, produced by this process rather than found** — SEP02
and SEP10. For each, the generated draft is in `legacy/file-notes/<slug>-cds.json`
and the issued version is the `EDITED-BY-TRISTAN.md` example. That draft/issued
pair is the calibration signal; the transcript itself only needs saving into
`source-transcripts/` if a run is to be reproduced end to end.

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
