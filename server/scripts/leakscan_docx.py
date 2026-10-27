"""Scan every XML part of a .docx for words that must not be in it.

    python server/scripts/leakscan_docx.py <file.docx> <word> [<word> ...]

Exits 1 and lists each hit (part, word, context) if any word is found. Used to
prove a master cloned from a real client's document carries none of their data.
"""
import re
import sys
import zipfile


def scan(path, words):
    hits = []
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if not name.endswith(('.xml', '.rels')):
                continue
            xml = z.read(name).decode('utf-8', 'replace')
            text = re.sub(r'<[^>]+>', '', xml)
            for w in words:
                for m in re.finditer(re.escape(w), text, re.I):
                    hits.append((name, w, text[max(0, m.start() - 40):m.end() + 40]))
    return hits


if __name__ == '__main__':
    hits = scan(sys.argv[1], sys.argv[2:])
    for name, w, ctx in hits:
        print(f'{name}: {w!r} ...{ctx}...')
    print(f'{len(hits)} hit(s)')
    sys.exit(1 if hits else 0)
