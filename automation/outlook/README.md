# Outlook connector (local desktop / COM)

Reads the mailbox already signed in to the **Outlook desktop app** on this machine
via COM automation. No Azure app registration, no `Mail.Read` admin consent, no
cloud — it runs entirely locally against Outlook.

- **Read-only** against Outlook: never sends, deletes, moves or marks mail.
- Works because Outlook desktop (Microsoft 365) is installed and authenticated here.
- Mailbox: `Tristan.Biro@lakesidefinancial.com.au`.

## Usage

```powershell
# Last 7 days of the Inbox -> JSON on stdout
powershell -NoProfile -File scan-outlook.ps1 -Days 7

# Last 30 days from a sender, save attachments into the app's intake area
powershell -NoProfile -File scan-outlook.ps1 -Days 30 -From "aia.com" `
  -Out ..\..\intake\outlook\scan.json -SaveAttachments ..\..\intake\outlook\attachments
```

### Parameters

| Param | Default | Purpose |
|-------|---------|---------|
| `-Days` | 7 | Look-back window (days). |
| `-Folder` | Inbox | `Inbox`, `SentItems`, or `Drafts`. |
| `-From` | — | Substring match on sender name/email. |
| `-Subject` | — | Substring match on subject. |
| `-MaxItems` | 200 | Safety cap on messages returned. |
| `-IncludeBody` | off | Add a ~600-char body preview (sensitive — off by default). |
| `-SaveAttachments` | — | Directory to save real attachments into (created if missing). |
| `-Out` | stdout | Write JSON to this path instead of stdout. |

## Output

JSON array of `{ receivedTime, senderName, senderEmail, subject, hasAttachments,
attachmentNames[], savedAttachments[], unread, entryId }`. This feeds the app's
existing document pipeline (`server/src/services/documentScan.js` /
`documentExtractor.js`) for statement/attachment extraction.

## Privacy

Scans touch client correspondence. Outputs and saved attachments are git-ignored.
Keep automated scanning within the licensee's (Pareto) data-handling policy.
