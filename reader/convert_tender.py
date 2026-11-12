#!/usr/bin/env python3
"""Convert a folder of downloaded tender documents to text and report what happened.

Usage: python3 -I reader/convert_tender.py DOCS_DIR TEXT_DIR REPORT_JSON

The report and the log carry file names, character lengths and skip reasons only.
Document text is written to TEXT_DIR and nowhere else.
"""
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile

MIN_CHARS = 100          # below this a file counts as having no text (scanned)
MAX_ZIP_BYTES = 200 * 1024 * 1024
KINDS = {".docx": "docx", ".doc": "doc", ".pdf": "pdf", ".xlsx": "xlsx", ".xlsm": "xlsx", ".xls": "xls"}


def _convert():
    # python -I leaves the script folder off sys.path; append so this folder's convert.py loads
    # without shadowing anything in the standard library.
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    import convert  # reader/convert.py, the handoff functions
    return convert


def _docx(path):
    return _convert().docx_to_text(path)


def _doc(path):
    c = _convert()
    with tempfile.TemporaryDirectory() as wd:
        return c.docx_to_text(c.soffice_to_docx(path, wd))


def _pdf(path):
    return _convert().pdf_to_text(path)


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


def _safe_name(name):
    base = os.path.basename(name.replace("\\", "/")) or "x"
    return re.sub(r"[^\w.\- ()ąčęėįšųūžĄČĘĖĮŠŲŪŽ]", "_", base)


def _entry(file, status, chars=0, reason=None):
    return {"file": file, "status": status, "chars": chars, "reason": reason}


def _convert_one(path, label, text_dir, converters, entries):
    ext = os.path.splitext(path)[1].lower()
    kind = KINDS.get(ext)
    if kind is None:
        entries.append(_entry(label, "skipped", reason="unsupported file type %s" % (ext or "(none)")))
        return
    try:
        text = converters[kind](path)
    except Exception as ex:
        entries.append(_entry(label, "skipped", reason="conversion failed (%s)" % type(ex).__name__))
        return
    n = len(text.strip())
    if n < MIN_CHARS:
        why = "no text (scanned PDF)" if kind == "pdf" else "no text"
        entries.append(_entry(label, "skipped", n, why))
        return
    os.makedirs(text_dir, exist_ok=True)
    try:
        with open(os.path.join(text_dir, label.replace("/", "__") + ".txt"), "w", encoding="utf-8") as f:
            f.write(text)
    except OSError as ex:
        entries.append(_entry(label, "skipped", n, "could not save text (%s)" % type(ex).__name__))
        return
    entries.append(_entry(label, "read", n))


def convert_tree(docs_dir, text_dir, converters=None):
    """Convert every file in docs_dir (zips unpacked one level). Returns report entries."""
    converters = converters or DEFAULT_CONVERTERS
    entries = []
    for name in sorted(os.listdir(docs_dir)):
        path = os.path.join(docs_dir, name)
        if not os.path.isfile(path):
            continue
        if not name.lower().endswith(".zip"):
            _convert_one(path, name, text_dir, converters, entries)
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
        labels = set()
        with tempfile.TemporaryDirectory() as td:
            for idx, i in enumerate(infos):
                member = _safe_name(i.filename)
                label = name + "/" + member
                if label in labels:  # same base name twice: keep both texts apart
                    label = "%s/%d_%s" % (name, idx, member)
                labels.add(label)
                # Unpacked under the member's index, so names never clash and never leave td.
                dst = os.path.join(td, "%d_%s" % (idx, member))
                if not member.strip(".") or os.path.dirname(dst) != td:
                    entries.append(_entry(label, "skipped", reason="unusable file name in zip"))
                    continue
                if member.lower().endswith(".zip"):
                    entries.append(_entry(label, "skipped", reason="nested zip (EBVPD)"))
                    continue
                try:
                    with z.open(i) as src, open(dst, "wb") as out:
                        shutil.copyfileobj(src, out)
                except Exception as ex:  # bad name for this disk, bad CRC, encrypted, odd compression
                    entries.append(_entry(label, "skipped", reason="could not unpack (%s)" % type(ex).__name__))
                    continue
                _convert_one(dst, label, text_dir, converters, entries)
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
