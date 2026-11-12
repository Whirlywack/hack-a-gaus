#!/usr/bin/env python3
"""Convert a folder of downloaded tender documents to text and report what happened.

Usage: python3 -I reader/convert_tender.py DOCS_DIR TEXT_DIR REPORT_JSON

The report and the log carry file names, character lengths and skip reasons only.
Document text is written to TEXT_DIR and nowhere else.
"""
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import unicodedata
import zipfile

MIN_CHARS = 100          # below this a file counts as having no text (scanned)
MAX_ZIP_BYTES = 200 * 1024 * 1024
FORMATS = {".docx": "docx", ".doc": "doc", ".pdf": "pdf", ".xlsx": "xlsx", ".xlsm": "xlsx", ".xls": "xls"}
HERE = os.path.dirname(os.path.abspath(__file__))

# Skip rules from the handoff's cascade/convert.py. The name rules match the file's own name folded
# to ASCII; the handoff matched the whole path, so a zip named for prices dropped every file in it.
BOILERPLATE_PATTERNS = ["espd-request"]  # generic EBVPD/ESPD request form, same text in every tender
NAME_PATTERNS = ["kain", "samat", "ziniarast", "kiekiu", "kiekiai", "sutartiniai ikainiai"]  # price lists
DIGIT_DENSITY_MAX = 0.30  # share of digits among non-space characters


def _handoff():
    """reader/convert.py, the handoff's converters. Imported on first use, so the tests that
    supply their own converters need no python-docx."""
    # python -I leaves the script folder off sys.path; append so this folder's convert.py loads
    # without shadowing anything in the standard library.
    if HERE not in sys.path:
        sys.path.append(HERE)
    import convert
    return convert


def _docx(path):
    return _handoff().docx_to_text(path)


def _doc(path):
    c = _handoff()
    with tempfile.TemporaryDirectory() as wd:
        return c.docx_to_text(c.soffice_to_docx(path, wd))


def _pdf(path):
    return _handoff().pdf_to_text(path)


def _xlsx(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    parts = []
    for ws in wb.worksheets:
        parts.append("## sheet " + ws.title)
        for row in ws.iter_rows(values_only=True):
            if any(c is not None for c in row):
                parts.append(" | ".join("" if c is None else str(c) for c in row))
    return "\n".join(parts)


def _xls(path):
    import subprocess
    with tempfile.TemporaryDirectory() as wd:
        prof = os.path.join(wd, "profile")
        subprocess.run(["soffice", "--headless", "--norestore", "-env:UserInstallation=file://" + prof,
                        "--convert-to", "xlsx", "--outdir", wd, path],
                       capture_output=True, timeout=240, stdin=subprocess.DEVNULL)
        out = os.path.join(wd, os.path.splitext(os.path.basename(path))[0] + ".xlsx")
        if not os.path.exists(out):
            raise RuntimeError("soffice could not open the file")
        return _xlsx(out)


DEFAULT_CONVERTERS = {"docx": _docx, "doc": _doc, "pdf": _pdf, "xlsx": _xlsx, "xls": _xls}


def clean(text):
    """The handoff's clean() from cascade/convert.py, unchanged: it ran on every converted text
    before the text was measured and saved."""
    text = text.replace("\u00a0", " ").replace("\r", "")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def digit_density(text):
    """The handoff's digit_density() from cascade/convert.py."""
    s = re.sub(r"\s", "", text)
    return (sum(c.isdigit() for c in s) / len(s)) if s else 0.0


def ascii_fold(s):
    """The handoff's ascii_fold() from cascade/common.py: accents dropped, lower-cased."""
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)).lower()


def _safe_name(name):
    base = os.path.basename(name.replace("\\", "/")) or "x"
    return re.sub(r"[^\w.\- ()ąčęėįšųūžĄČĘĖĮŠŲŪŽ]", "_", base)


def _entry(file, status, chars=0, reason=None):
    return {"file": file, "status": status, "chars": chars, "reason": reason}


def _convert_one(path, label, text_dir, converters, entries, seen):
    """seen maps the hash of each saved text, whitespace normalised, to the file it came from."""
    ext = os.path.splitext(path)[1].lower()
    fmt = FORMATS.get(ext)
    if fmt is None:
        entries.append(_entry(label, "skipped", reason="unsupported file type %s" % (ext or "(none)")))
        return
    name = ascii_fold(label.rsplit("/", 1)[-1])
    if any(p in name for p in BOILERPLATE_PATTERNS):
        entries.append(_entry(label, "skipped", reason="generic ESPD request form (boilerplate)"))
        return
    hit = [p for p in NAME_PATTERNS if p in name]
    if hit:
        entries.append(_entry(label, "skipped", reason="price list / bill of quantities by name (%s)" % hit[0]))
        return
    try:
        text = clean(converters[fmt](path))
    except Exception as ex:
        entries.append(_entry(label, "skipped", reason="conversion failed (%s)" % type(ex).__name__))
        return
    n = len(text.strip())
    if n < MIN_CHARS:
        why = "no text (scanned PDF)" if fmt == "pdf" else "no text"
        entries.append(_entry(label, "skipped", n, why))
        return
    dd = digit_density(text)
    if dd > DIGIT_DENSITY_MAX:
        entries.append(_entry(label, "skipped", n, "numeric-dense (%.2f) price list / quantities" % dd))
        return
    h = hashlib.sha256(re.sub(r"\s+", " ", text).encode()).hexdigest()
    if h in seen:
        entries.append(_entry(label, "skipped", n, "duplicate of " + seen[h]))
        return
    os.makedirs(text_dir, exist_ok=True)
    try:
        with open(os.path.join(text_dir, label.replace("/", "__") + ".txt"), "w", encoding="utf-8") as f:
            f.write(text)
    except OSError as ex:
        entries.append(_entry(label, "skipped", n, "could not save text (%s)" % type(ex).__name__))
        return
    seen[h] = label  # only a saved text counts, so a copy of a text that could not be saved is still read
    entries.append(_entry(label, "read", n))


def convert_tree(docs_dir, text_dir, converters=None):
    """Convert every file in docs_dir (zips unpacked one level). Returns report entries."""
    converters = converters or DEFAULT_CONVERTERS
    entries, seen = [], {}
    for name in sorted(os.listdir(docs_dir)):
        path = os.path.join(docs_dir, name)
        if not os.path.isfile(path):
            continue
        if not name.lower().endswith(".zip"):
            _convert_one(path, name, text_dir, converters, entries, seen)
            continue
        try:
            z = zipfile.ZipFile(path)
            infos = [i for i in z.infolist() if not i.is_dir()]
        except zipfile.BadZipFile:
            entries.append(_entry(name, "skipped", reason="not a zip file"))
            continue
        if sum(i.file_size for i in infos) > MAX_ZIP_BYTES:
            entries.append(_entry(name, "skipped", reason="zip too big to unpack"))
            continue
        folder = name[:-4]  # as the handoff's extract.py: members of x.zip are x/<member>
        labels = set()
        with tempfile.TemporaryDirectory() as td:
            for idx, i in enumerate(infos):
                member = _safe_name(i.filename)
                label = folder + "/" + member
                if label in labels:  # same base name twice: keep both texts apart
                    label = "%s/%d_%s" % (folder, idx, member)
                labels.add(label)
                # Unpacked under the member's index, so names never clash and never leave td.
                dst = os.path.join(td, "%d_%s" % (idx, member))
                if not member.strip(".") or os.path.dirname(dst) != td:
                    entries.append(_entry(label, "skipped", reason="unusable file name in zip"))
                    continue
                if member.lower().endswith(".zip"):
                    entries.append(_entry(label, "skipped", reason="nested zip, not unpacked"))
                    continue
                try:
                    with z.open(i) as src, open(dst, "wb") as out:
                        shutil.copyfileobj(src, out)
                except Exception as ex:  # bad name for this disk, bad CRC, encrypted, odd compression
                    entries.append(_entry(label, "skipped", reason="could not unpack (%s)" % type(ex).__name__))
                    continue
                _convert_one(dst, label, text_dir, converters, entries, seen)
    return entries


def report_lines(entries):
    lines = []
    for e in entries:
        if e["status"] == "read":
            lines.append("read    %8d chars  %s" % (e["chars"], e["file"]))
        else:
            lines.append("skipped %8s        %s  (%s)" % ("-", e["file"], e["reason"]))
    read = sum(1 for e in entries if e["status"] == "read")
    lines.append("total: %d read, %d skipped" % (read, len(entries) - read))
    return lines


def main(argv):
    docs_dir, text_dir, report_path = argv
    entries = convert_tree(docs_dir, text_dir)
    for line in report_lines(entries):
        print(line)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
