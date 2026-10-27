# DocuSign draft envelope (optional)

Version 1.0.0. Skip this step unless Tristan asks for it. (default, Q-PK-6) The script only ever
creates **drafts** (status `created`). Tristan checks the fields in DocuSign and sends it himself.

Status (22 Oct 2026): script built and dry-run tested. Developer app, config and Go-Live
(20 successful demo calls within 30 days) not confirmed; run `check` first and report what it says.

When asked: Claude writes the manifest, runs the dry run, shows Tristan the result, and runs the
real `draft` only after he approves. (default, Q-PK-6)

Countersigner: not settled. Before any real draft, ask Tristan who countersigns (him for
everything, him for the SOA and Josh Davidson for applications, or Josh) and confirm the config
names that person. Until he answers, the READ ME routing shows `[ADVISER TO CONFIRM]` and it is on
the review list. (open, Q-PK-1)

## Tool

`legacy/docusign/docusign.mjs` (eSignature REST v2.1, JWT grant). Setup: `legacy/docusign/README.md`.

```
node legacy/docusign/docusign.mjs check
node legacy/docusign/docusign.mjs draft "<case>\.build\docusign-manifest.json" --dry-run
node legacy/docusign/docusign.mjs draft "<case>\.build\docusign-manifest.json"
```

- Always dry-run first and show Tristan the result. Run the real `draft` only on his say-so.
- Credentials are outside the repo. Never open, print or copy them.
- While config `env` is `demo`, every signer is redirected to the test address. Good. Do not
  change that.

## Manifest

Lives in the case `.build\` folder. Never in the pack, never in SharePoint.

```json
{
  "folder": "<DOWNLOADS>/<Surname(s)> - SOA Pack",
  "emailSubject": "<Surname(s)> - Statement of Advice for signing",
  "emailBlurb": "",
  "signers": {
    "client1": { "name": "[CLIENT_1 FULL NAME]", "email": "[CLIENT_1 ADDRESS]", "routingOrder": 1 },
    "client2": { "name": "[CLIENT_2 FULL NAME]", "email": "[CLIENT_2 ADDRESS]", "routingOrder": 1 },
    "adviser": "config"
  },
  "documents": [
    { "file": "01 - Statement of Advice - <pack name>.pdf", "name": "Statement of Advice",
      "tabs": { "client1": [ { "type": "signHere", "page": "[PAGE]", "x": "[X]", "y": "[Y]" } ] } }
  ]
}
```

Rules:

- Documents in pack order, every numbered item up to and including the PDS. Never the FINAL
  summaries or Risk Checklist. (default, Q-PK-3)
- Where a document is in the pack as .docx and .pdf, only the PDF goes in. (default, Q-PK-8)
- Fields: clients sign the SOA Authority to Proceed, their own application(s) and their own
  letters. FSG, Fact Find and PDS go in with no fields. (default, Q-PK-3)
- Subject `<Surname(s)> - Statement of Advice for signing`; message left empty. (default, Q-PK-6)
- File names use the two-digit numbers (the script's code comment shows `1 - ...`; that is old).
- Both clients `routingOrder` 1 (parallel). `"adviser": "config"` takes the adviser from config
  and sets routing order 2. Who the config adviser is: ask Tristan before any real draft; the
  example config still names Josh Davidson. (open, Q-PK-1)
- Tab types: `signHere`, `dateSigned`, `checkbox`, `initialHere`, `fullName`, `text`.
- PDF tabs: page plus x/y in PDF points from top left (find them with pymupdf).
- .docx tabs: `anchor` text plus `dx`/`dy`. The anchor must be unique across the whole envelope.
- Signer addresses come from the Fact Find. Check them with Tristan.
- Field positions are found by hand for each pack; there is no standard per document type.
  (default, Q-PK-6)
