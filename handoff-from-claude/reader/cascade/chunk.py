#!/usr/bin/env python3
"""Split converted texts into ~1800-2200 char passages on paragraph / table-row boundaries.
Never splits a table row; keeps a table with its preceding heading paragraph when <2500 chars.
Usage: python3 -I chunk.py   -> cascade/chunks.jsonl"""
import json, os, re, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))  # append, not insert: select.py must not shadow stdlib select
from common import *

LO, TARGET, HI, KEEP = 1800, 2200, 2500, 2500


def is_row(line):
    return " | " in line


def split_long(text, start):
    """Split an over-long paragraph on sentence boundaries into atoms (text, start, end)."""
    pieces, pos = [], 0
    for m in re.finditer(r"(?<=[.;:!?])\s+", text):
        pieces.append((pos, m.start()))
        pos = m.end()
    pieces.append((pos, len(text)))
    atoms, cur_s, cur_e = [], None, None
    for s, e in pieces:
        while e - s > TARGET:  # hard split at whitespace
            cut = text.rfind(" ", s, s + TARGET)
            cut = cut if cut > s else s + TARGET
            pieces_cut = (s, cut)
            if cur_s is not None:
                atoms.append((text[cur_s:cur_e], start + cur_s, start + cur_e)); cur_s = None
            atoms.append((text[pieces_cut[0]:pieces_cut[1]], start + pieces_cut[0], start + pieces_cut[1]))
            s = cut + 1
        if cur_s is None:
            cur_s, cur_e = s, e
        elif e - cur_s <= TARGET:
            cur_e = e
        else:
            atoms.append((text[cur_s:cur_e], start + cur_s, start + cur_e))
            cur_s, cur_e = s, e
    if cur_s is not None:
        atoms.append((text[cur_s:cur_e], start + cur_s, start + cur_e))
    return atoms


def make_atoms(text):
    lines, pos = [], 0
    for ln in text.split("\n"):
        lines.append((ln, pos, pos + len(ln)))
        pos += len(ln) + 1
    lines = [l for l in lines if l[0].strip()]
    atoms = []  # (text, start, end)
    i = 0
    while i < len(lines):
        ln, s, e = lines[i]
        if is_row(ln):
            j = i
            while j < len(lines) and is_row(lines[j][0]):
                j += 1
            block = lines[i:j]
            size = block[-1][2] - block[0][1]
            # heading = immediately preceding non-row paragraph (already emitted as last atom)
            head = None
            if atoms and not is_row(atoms[-1][0]) and len(atoms[-1][0]) <= 400 and atoms[-1][2] <= block[0][1]:
                head = atoms.pop()
            if size + (len(head[0]) + 1 if head else 0) <= KEEP:
                a_s = head[1] if head else block[0][1]
                body = ("\n".join(b[0] for b in block))
                atoms.append(((head[0] + "\n" if head else "") + body, a_s, block[-1][2]))
            else:
                first = True
                for b in block:
                    if first and head:
                        atoms.append((head[0] + "\n" + b[0], head[1], b[2]))
                    else:
                        atoms.append((b[0], b[1], b[2]))
                    first = False
            i = j
        else:
            if e - s > TARGET:
                atoms.extend(split_long(ln, s))
            else:
                atoms.append((ln, s, e))
            i += 1
    return atoms


def pack(atoms):
    out, cur = [], []
    def size(c):
        return sum(len(a[0]) for a in c) + max(len(c) - 1, 0)
    for a in atoms:
        if not cur:
            cur = [a]; continue
        tot = size(cur) + 1 + len(a[0])
        if tot <= TARGET or (size(cur) < LO and tot <= HI):
            cur.append(a)
        else:
            out.append(cur); cur = [a]
    if cur:
        out.append(cur)
    # merge a small trailing passage into the previous one
    if len(out) > 1 and size(out[-1]) < 800 and size(out[-2]) + 1 + size(out[-1]) <= 2600:
        out[-2].extend(out.pop())
    return out


def main():
    manifest = json.load(open(os.path.join(CASCADE, "manifest.json"), encoding="utf-8"))
    rows, per = [], {}
    for tid in TENDERS:
        entries = [e for e in manifest.get(tid, []) if not e["skipped"]]
        entries.sort(key=lambda e: e["text_file"])
        for fi, e in enumerate(entries):
            text = open(os.path.join(TEXT, tid, e["text_file"]), encoding="utf-8").read()
            for n, grp in enumerate(pack(make_atoms(text))):
                body = "\n".join(a[0] for a in grp)
                rows.append({"id": "%s:%d:%d" % (tid, fi, n), "tender": tid, "file_index": fi, "n": n,
                             "file": e["file"], "text_file": e["text_file"],
                             "start": grp[0][1], "end": grp[-1][2], "chars": len(body), "text": body})
                per[tid] = per.get(tid, 0) + 1
    write_jsonl(CHUNKS, rows)
    for tid in TENDERS:
        print("%s: %d passages" % (tid, per.get(tid, 0)))
    ch = [r["chars"] for r in rows]
    print("total %d passages, %d chars; median %d, <200: %d, >2500: %d" % (
        len(rows), sum(ch), sorted(ch)[len(ch) // 2], sum(c < 200 for c in ch), sum(c > 2500 for c in ch)))


if __name__ == "__main__":
    main()
