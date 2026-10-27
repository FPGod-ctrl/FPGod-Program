# Extraction methods

Version 0.1.0-draft. Part of `case-folder-intake`.

Commands for reading each file type. Run them on the copy in `source\` only. Write output to `text\`, `pages\` or `converted\`. Keep any script in `.build\`, never inside `source\`.

Tools on Tristan's machine (checked 27 Oct 2026, spec Part 5 §14): `pdftotext` (xpdf 4.06), Python 3.14 with `pymupdf` and `python-docx`, `mammoth` and `xlsx` in `server/node_modules`, Word and Excel COM, `robocopy`. The `.msg` reader package named in the spec is **not installed**. Other machines: check first. [Q-IN-11]

Paths below: `<SP>` = the client folder under `LEGACY_LIBRARY_ROOT`. `<W>` = the intake working folder. `<REPO>` = the repo root.

## 1. Copy out

Try a plain copy first (PowerShell):

```powershell
Copy-Item -LiteralPath "<SP>\1. Advice\<YYYY> Advice & Service" -Destination "<W>\source" -Recurse
```

If it fails (path too long, placeholder will not download), use robocopy:

```powershell
robocopy "<SP>\1. Advice\<YYYY> Advice & Service" "<W>\source" /E /COPY:DT /DCOPY:T /R:2 /W:5 /XJ /NP /LOG:"<W>\copy-log.txt"
```

- The library path is always the **first** argument.
- Never add `/MIR`, `/PURGE`, `/MOV`, `/MOVE` or `/M`. They delete or change files at the source.
- robocopy exit codes 0–7 are success. 8 or more means some files failed; list them from the log.
- Long paths for other tools: prefix with `\\?\` or work from the copy.

## 2. PDF text

```bash
pdftotext -layout "<W>/source/<file>.pdf" "<W>/text/<file>.txt"
```

Empty or near-empty output means a scan. Use §3.

## 3. Scans, ratings tables, logos (pymupdf)

```python
# .build/render_pages.py  <pdf> <out_dir>
import sys, pathlib, fitz
pdf, out = sys.argv[1], pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(pdf)
for p in doc:
    (out / f"p{p.number + 1:02d}.txt").write_text(p.get_text(), encoding="utf-8")
    p.get_pixmap(dpi=150).save(str(out / f"p{p.number + 1:02d}.png"))
```

Run with `python -I .build/render_pages.py "<W>/source/<file>.pdf" "<W>/pages/<file>"`. Then read the PNGs. Do this for every Risk Researcher run, Compare Ratings and One on One Comparison PDF.

## 4. Insurer application form fields

```python
# .build/form_fields.py  <pdf>
import sys, fitz
doc = fitz.open(sys.argv[1])
for p in doc:
    for w in p.widgets() or []:
        print(f"p{p.number + 1}\t{w.field_name}\t{w.field_type_string}\t{w.field_value!r}")
```

Save the output to `text\<file>.fields.txt`. Read it with the page text: the fields hold income history, travel and health answers.

## 5. Word .docx

Body text:

```bash
node -e "require('<REPO>/server/node_modules/mammoth').extractRawText({path: process.argv[1]}).then(r => process.stdout.write(r.value))" "<W>/source/<file>.docx" > "<W>/text/<file>.txt"
```

mammoth skips headers, footers and some text boxes. Also list the package:

```python
# .build/docx_parts.py  <docx>
import sys, zipfile, re
z = zipfile.ZipFile(sys.argv[1])
for n in z.namelist():
    if re.match(r"word/(header|footer)\d*\.xml$", n):
        print(f"== {n}\n" + re.sub(r"<[^>]+>", " ", z.read(n).decode("utf-8", "replace")))
    if n.startswith("word/media/"):
        print(f"== image {n} ({z.getinfo(n).file_size} bytes)")
```

## 6. Word .doc

Convert the **copy** with Word COM, opened read only, saved into `converted\`. [Q-IN-4]

```powershell
$w = New-Object -ComObject Word.Application; $w.Visible = $false
try {
  $d = $w.Documents.Open("<W>\source\<file>.doc", $false, $true)   # ConfirmConversions=false, ReadOnly=true
  $d.SaveAs2("<W>\converted\<file>.docx", 16)                        # 16 = wdFormatDocumentDefault
  $d.Close($false)
} finally { $w.Quit() }
```

Then read the `.docx` with §5. Never run this on a SharePoint path.

## 7. Spreadsheets

```bash
node -e "
const X = require('<REPO>/server/node_modules/xlsx');
const wb = X.readFile(process.argv[1]);
for (const n of wb.SheetNames) {
  const hidden = (wb.Workbook?.Sheets?.find(s => s.name === n)?.Hidden) ? ' (hidden)' : '';
  console.log('# Sheet: ' + JSON.stringify(n) + hidden);
  console.log(X.utils.sheet_to_csv(wb.Sheets[n]));
}" "<W>/source/<file>.xlsx" > "<W>/text/<file>.txt"
```

- `JSON.stringify` shows trailing spaces. The CvC sheet is `"CvC "`.
- Values are the cached results Excel saved. A formula cell with no cached value prints empty: flag it.
- Insurance Cover Summary workbooks hold "Discussion Summary" option sheets and the `CvC ` sheet. Read all of them.

## 8. Saved emails (.msg)

Not opened until [Q-IN-1] is answered. List the file name, size and modified date only.

## 9. Images

Open `.png` and `.jpg` files directly and read them. `.heic` may need converting on the copy first; ask.
