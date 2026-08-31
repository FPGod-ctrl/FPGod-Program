# Drop folder

The inbox. Anything put here is read by Claude to work out the house standard a
generator has to hit.

## One subfolder per task

Work is segmented by task so it stays easy to read and nothing gets mixed up
between jobs. Each task gets its own folder with its own README explaining what
belongs in it.

| Folder | Task | Status |
|--------|------|--------|
| [`soa-build/`](soa-build/) | Building the Legacy Risk Advice SOA generator | **Active** |

New folders get added here as new work starts — a client profile build, a fact
find build, a risk report build, and so on. Keeping them separate means a
document dropped for one job is never mistaken for reference material for
another.

**Naming:** lowercase, hyphenated, named for the task rather than the document
type — `soa-build`, not `soas`. The document-type folders live one level up
(`../soa/`, `../client-profiles/`) and hold finished work, not inputs.

**Nesting:** go as deep as is useful. A task folder splits by input kind
(`templates/` vs `examples/`), and those split again where the distinction
changes how the document is read — `examples/replacement/` carries comparison
tables and the do-not-cancel warning that `examples/new-cover/` has no reason
to. Every folder that is not self-evident gets a line in its parent's README.
Depth is free; ambiguity is not.

## Formats — applies to every subfolder

`.docx`, `.pdf`, `.md` and `.txt` all extract cleanly.

**`.doc` does not.** There is no parser for the old binary Word format and the
fallback produces control-character soup rather than text — this is why 199 of
the archived Lakeside reference plans could not be imported. Open any `.doc` in
Word and re-save it as `.docx` first.

## Client data

These are real client documents. They stay on this machine, are read only to
derive structure and house wording, and are never used as content in another
client's advice — that rule is enforced in the generator's guardrails and
covered by tests.

Once a task is done, either move the documents to the folder they belong in
(`../soa/`, `../client-profiles/`, …) or delete them. The drop folder is a
working inbox, not storage.
