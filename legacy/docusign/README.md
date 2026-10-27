# DocuSign draft envelopes

`docusign.mjs` turns an SOA pack folder into a **draft** DocuSign envelope. It adds the documents in pack order,
the signers (both clients sign in parallel, then the adviser countersigns) and the signature, date and tick-box
fields. It never sends anything: the envelope is saved as a draft for you to check and send in DocuSign.

Credentials stay outside the repo, in `C:\Users\TristanBiro\.docusign\`.

## One-time setup

DocuSign makes every API app start in its free **developer (demo)** environment. An app only moves to your real
account after it passes "Go-Live", which needs 20 successful API calls in demo within 30 days. So set it up in demo
first, test it with drafts sent to yourself, then go live.

1. **Developer account.** Sign up free at <https://developers.docusign.com> (any email; it is separate from your real
   account).
2. **Create the app.** In the developer account: Settings → **Apps and Keys** → **Add App and Integration Key**.
   Name it `Legacy SOA packs`.
   - Copy the **Integration Key**.
   - Under *Authentication* choose **Authorization Code Grant**. Then **Generate RSA**, and save the private key as
     `C:\Users\TristanBiro\.docusign\private.key`. It is shown only once.
   - Under *Additional settings* → **Redirect URIs**, add `https://www.docusign.com`.
   - Save.
3. **IDs.** On the same Apps and Keys page, copy the **User ID** and the **API Account ID**.
4. **Config file.** Create `C:\Users\TristanBiro\.docusign\config.json`:
   ```json
   {
     "env": "demo",
     "integrationKey": "<Integration Key>",
     "userId": "<User ID>",
     "accountId": "<API Account ID>",
     "privateKeyFile": "private.key",
     "redirectUri": "https://www.docusign.com",
     "adviser": { "name": "Joshua Davidson", "email": "<Josh's email>" },
     "testEmail": "<your own email>"
   }
   ```
   While `env` is `demo`, every signer's email is replaced with `testEmail`, so a test envelope can never reach a
   client.
5. **Consent.** Run `node legacy/docusign/docusign.mjs consent`, open the link, log in and click **Accept**.
6. **Check.** Run `node legacy/docusign/docusign.mjs check`. It should print your name and account.

## Making a draft

Each pack has a `docusign-manifest.json` in its case `.build/` folder. The manifest lists the documents, the signers
and the field positions on each signing page, in PDF points from the top left.

```
node legacy/docusign/docusign.mjs draft "<path to docusign-manifest.json>" --dry-run   # check it, no API call
node legacy/docusign/docusign.mjs draft "<path to docusign-manifest.json>"             # create the draft
```

Then open DocuSign → Agreements → **Drafts**, check the field placement, and send.

## Going live

Once 20 calls have succeeded in demo, open the app in Apps and Keys and choose **Start Go-Live Review**. When
DocuSign approves it, log in to your **real** account. Under Apps and Keys, add the approved key and generate a new
RSA key for production. Update `config.json` with `"env": "prod"` and the production User ID, Account ID and key.
Then run `consent` and `check` again.
