# DocuSign draft envelope (optional)

Version 0.1.0-draft. Only when the adviser asks. The script only ever creates **drafts** (status
`created`). The adviser checks the fields in DocuSign and sends it himself.

Status (22 Oct 2026): script built and dry-run tested. Developer app, config and Go-Live
(20 successful demo calls within 30 days) not confirmed [Q-PK-6].

## Tool

`legacy/docusign/docusign.mjs` (eSignature REST v2.1, JWT grant). Setup: `legacy/docusign/README.md`.

```
node legacy/docusign/docusign.mjs check
node legacy/docusign/docusign.mjs draft "<case>\.build\docusign-manifest.json" --dry-run
node legacy/docusign/docusign.mjs draft "<case>\.build\docusign-manifest.json"
```

- Always dry-run first and show the adviser the result. Run the real `draft` only on his say-so.
- Credentials are outside the repo. Never open, print or copy them.
- While config `env` is `demo`, every signer is redirected to the test address. Good. Do not
  change that.

## Manifest

Lives in the case `.build\` folder. Never in the pack, never in SharePoint.

```json
{
  "folder": "C:/Users/TristanBiro/Downloads/<Surname(s)> - SOA Pack",
  "emailSubject": "<subject> [Q-PK-6]",
  "emailBlurb": "<message> [Q-PK-6]",
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

- Documents in pack order, up to and including the PDS. Never the FINAL summaries or Risk
  Checklist.
- File names use the two-digit numbers (the script's code comment shows `1 - ...`; that is old).
- Both clients `routingOrder` 1 (parallel). `"adviser": "config"` takes the adviser from config
  and sets routing order 2. Who the config adviser is: [Q-PK-1]. The example config still names
  Josh Davidson.
- Tab types: `signHere`, `dateSigned`, `checkbox`, `initialHere`, `fullName`, `text`.
- PDF tabs: page plus x/y in PDF points from top left (find them with pymupdf).
- .docx tabs: `anchor` text plus `dx`/`dy`. The anchor must be unique across the whole envelope.
- Signer addresses come from the Fact Find. Check them with the adviser.
- Standard field positions per document type are not yet set [Q-PK-6].
