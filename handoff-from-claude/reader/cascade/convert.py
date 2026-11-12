#!/usr/bin/env python3
"""Re-convert ORIGINAL tender documents to text, keeping Word tables in place.
Usage: python3 -I convert.py [tender_id ...]
Writes cascade/text/<id>/<file>.txt and cascade/manifest.json."""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile
sys.path.append(os.path.dirname(os.path.abspath(__file__)))  # append, not insert: select.py must not shadow stdlib select
from common import *
import docx
from docx.oxml.ns import qn

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
MC = "{http://schemas.openxmlformats.org/markup-compatibility/2006}"

SKIP_EXT = {".xlsx", ".xls", ".xml", ".png", ".jpg", ".jpeg", ".gif", ".tif", ".tiff", ".bmp", ".dwg", ".dxf",
            ".zip", ".bin", ".txt", ".csv", ".svg", ".rar", ".7z", ".p7s", ".asice", ".edoc"}
NAME_PATTERNS = ["kain", "samat", "ziniarast", "kiekiu", "kiekiai", "sutartiniai ikainiai"]
BOILERPLATE_PATTERNS = ["espd-request"]  # generic EBVPD/ESPD request form, same text in every tender
DIGIT_DENSITY_MAX = 0.30  # share of digits among non-space characters


def anc_has(el, tags):
    p = el.getparent()
    while p is not None:
        if p.tag in tags:
            return True
        p = p.getparent()
    return False


def para_text(p):
    parts = []
    for el in p.iter():
        t = el.tag
        if t == W + "t":
            if anc_has(el, {W + "txbxContent", MC + "Fallback"}):
                continue
            parts.append(el.text or "")
        elif t == W + "tab":
            parts.append(" ")
        elif t in (W + "br", W + "cr"):
            parts.append(" ")
        elif t == W + "noBreakHyphen":
            parts.append("-")
    return re.sub(r"[ \t ]+", " ", "".join(parts)).strip()


def style_is_heading(p):
    ppr = p.find(W + "pPr")
    if ppr is not None:
        st = ppr.find(W + "pStyle")
        if st is not None:
            v = (st.get(W + "val") or "").lower()
            return v.startswith("heading") or v.startswith("antrat")
    return False


def textbox_paras(p):
    for tb in p.iter(W + "txbxContent"):
        if anc_has(tb, {MC + "Fallback"}):
            continue
        for q in tb.iter(W + "p"):
            yield q


def walk_block(container, out, depth=0):
    """Emit lines for children of body / cell / sdt in document order."""
    for ch in container:
        tag = ch.tag
        if tag == W + "p":
            tx = para_text(ch)
            if tx:
                out.append(("# " + tx) if style_is_heading(ch) and len(tx) < 200 else tx)
            for q in textbox_paras(ch):
                tq = para_text(q)
                if tq:
                    out.append(tq)
        elif tag == W + "tbl":
            render_table(ch, out, depth)
        elif tag in (W + "sdt",):
            c = ch.find(W + "sdtContent")
            if c is not None:
                walk_block(c, out, depth)
        elif tag in (W + "ins", W + "customXml", MC + "AlternateContent", MC + "Choice"):
            walk_block(ch, out, depth)


def cell_parts(tc):
    """Return (text, [nested tables])."""
    texts, nested = [], []
    def rec(node):
        for ch in node:
            if ch.tag == W + "p":
                t = para_text(ch)
                if t:
                    texts.append(t)
            elif ch.tag == W + "tbl":
                nested.append(ch)
            elif ch.tag == W + "sdt":
                c = ch.find(W + "sdtContent")
                if c is not None:
                    rec(c)
    rec(tc)
    return " ".join(texts), nested


def render_table(tbl, out, depth):
    ind = "  " * depth
    for tr in tbl.iter_rows() if False else [c for c in tbl if c.tag == W + "tr" or c.tag == W + "sdt"]:
        trs = [tr] if tr.tag == W + "tr" else [x for x in tr.iter(W + "tr")]
        for row in trs:
            cells, nesteds = [], []
            for tc in row:
                if tc.tag == W + "tc":
                    t, n = cell_parts(tc)
                    cells.append(t)
                    nesteds.extend(n)
                elif tc.tag == W + "sdt":
                    for tc2 in tc.iter(W + "tc"):
                        t, n = cell_parts(tc2)
                        cells.append(t)
                        nesteds.extend(n)
            # drop consecutive duplicate cells (merged-cell artefacts)
            dedup = []
            for c in cells:
                if not dedup or c != dedup[-1] or c == "":
                    dedup.append(c)
            if any(c for c in dedup):
                out.append(ind + " | ".join(dedup))
            for n in nesteds:
                render_table(n, out, depth + 1)


def docx_to_text(path):
    d = docx.Document(path)
    out = []
    walk_block(d.element.body, out)
    # headers/footers rarely carry requirements; skipped on purpose
    return "\n".join(out)


def soffice_to_docx(path, tmpdir):
    prof = os.path.join(tmpdir, "profile")
    cmd = ["soffice", "--headless", "--norestore", "-env:UserInstallation=file://" + prof,
           "--convert-to", "docx:MS Word 2007 XML", "--outdir", tmpdir, path]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=240, stdin=subprocess.DEVNULL)
    base = os.path.splitext(os.path.basename(path))[0] + ".docx"
    res = os.path.join(tmpdir, base)
    if not os.path.exists(res):
        raise RuntimeError("soffice failed: " + (r.stderr or r.stdout)[-300:])
    return res


def pdf_to_text(path):
    r = subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", path, "-"], capture_output=True, timeout=240)
    txt = r.stdout.decode("utf-8", "replace").replace("\f", "\n")
    lines = [re.sub(r"[ \t]{3,}", "  ", l.rstrip()) for l in txt.split("\n")]
    return "\n".join(lines)


def clean(text):
    text = text.replace(" ", " ").replace("\r", "")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def digit_density(text):
    s = re.sub(r"\s", "", text)
    return (sum(c.isdigit() for c in s) / len(s)) if s else 0.0


def list_files(tdir):
    for dp, dn, fn in os.walk(tdir):
        dn.sort()
        for f in sorted(fn):
            yield os.path.relpath(os.path.join(dp, f), tdir)


def main():
    tenders = sys.argv[1:] or TENDERS
    manifest = {}
    tmp = tempfile.mkdtemp(prefix="cvt_", dir=CASCADE)
    try:
        for tid in tenders:
            tdir = os.path.join(DOCS, tid)
            odir = os.path.join(TEXT, tid)
            if os.path.isdir(odir):
                shutil.rmtree(odir)
            os.makedirs(odir)
            entries, seen = [], {}
            for rel in list_files(tdir):
                ext = os.path.splitext(rel)[1].lower()
                nm = ascii_fold(rel)
                e = {"file": rel, "chars": 0, "skipped": None}
                entries.append(e)
                if ext not in (".docx", ".doc", ".pdf"):
                    e["skipped"] = "extension " + (ext or "(none)")
                    continue
                if any(p in nm for p in BOILERPLATE_PATTERNS):
                    e["skipped"] = "generic ESPD request form (boilerplate)"
                    continue
                hit = [p for p in NAME_PATTERNS if p in nm]
                if hit:
                    e["skipped"] = "price list / bill of quantities by name (%s)" % hit[0]
                    continue
                try:
                    full = os.path.join(tdir, rel)
                    if ext == ".docx":
                        text = docx_to_text(full)
                    elif ext == ".doc":
                        wd = tempfile.mkdtemp(dir=tmp)
                        text = docx_to_text(soffice_to_docx(full, wd))
                    else:
                        text = pdf_to_text(full)
                except Exception as ex:
                    e["skipped"] = "FAILED: %s: %s" % (type(ex).__name__, str(ex)[:200])
                    continue
                text = clean(text)
                e["chars"] = len(text)
                if len(text.strip()) < 100:
                    e["skipped"] = "no/too little text (scanned or empty)"
                    continue
                dd = digit_density(text)
                e["digit_density"] = round(dd, 3)
                if dd > DIGIT_DENSITY_MAX:
                    e["skipped"] = "numeric-dense (%.2f) price list / quantities" % dd
                    continue
                h = hashlib.sha256(re.sub(r"\s+", " ", text).encode()).hexdigest()
                if h in seen:
                    e["skipped"] = "duplicate of " + seen[h]
                    continue
                seen[h] = rel
                outname = rel.replace(os.sep, "__") + ".txt"
                with open(os.path.join(odir, outname), "w", encoding="utf-8") as f:
                    f.write(text)
                e["text_file"] = outname
            manifest[tid] = entries
            ok = [e for e in entries if not e["skipped"]]
            print("%s: %d converted (%d chars), %d skipped" % (tid, len(ok), sum(e["chars"] for e in ok), len(entries) - len(ok)))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    mpath = os.path.join(CASCADE, "manifest.json")
    old = {}
    if os.path.exists(mpath) and sys.argv[1:]:
        old = json.load(open(mpath, encoding="utf-8"))
    old.update(manifest)
    json.dump(old, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
