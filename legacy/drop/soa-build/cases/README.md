# Client case folders — everything that goes into one SOA

Drop one folder per client, exactly as it sits on the shared drive. No need to
rename or sort the files — the SOA is drawn from whatever is inside.

```
cases/
  Smith J/
    fact find.docx
    quotes/...
    comparison.pdf
    emails/...
```

Everything in this folder is gitignored whatever its format — real client PII.

If the finished SOA for that client is included, name it so it is obvious
(or put it in a `_final/` subfolder). It is set aside unread, the SOA is
generated from the inputs alone, and then the two are compared.

`.doc` files cannot be read — re-save them as `.docx`.
