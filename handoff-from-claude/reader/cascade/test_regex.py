#!/usr/bin/env python3
"""Unit-test the candidate regexes on real lines grep'd from the converted texts (prints, asserts nothing is empty)."""
import glob, os, re, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from common import *
from candidates import find_candidates

PATS = [("eur", r"\d[\d .]*,\d\d\s*Eur"), ("eur", r"\d{3} 000\s*(EUR|Eur|eur)"), ("years", r"per (pastaruosius|paskutinius) \d"),
        ("count", r"ne mažiau kaip (vien|dvi|du)"), ("cert", r"ISO\s?\d{4,5}"), ("cert", r"atestat"), ("eur", r"apyvart\w+.{0,80}\d\s*(Eur|EUR|eur)")]
lines = {}
for p in sorted(glob.glob(os.path.join(TEXT, "*", "*.txt"))):
    for ln in open(p, encoding="utf-8").read().split("\n"):
        for kind, pat in PATS:
            if re.search(pat, ln, re.I) and len(ln) < 600:
                lines.setdefault((kind, pat), []).append(ln)
picked = []
for (kind, pat), ls in lines.items():
    for ln in ls[len(ls) // 3::max(1, len(ls) // 2)][:2]:
        picked.append((kind, ln))
bad = 0
for kind, ln in picked[:10]:
    m = re.search(r".{0,60}(%s).{0,60}" % "|".join(p for k, p in PATS if k == kind), ln, re.I)
    cands = [c for c in find_candidates(ln) if c["kind"] == kind]
    ok = bool(cands)
    bad += not ok
    print("%s [%s] ...%s..." % ("ok  " if ok else "FAIL", kind, (m.group(0) if m else ln[:120]).strip()))
    print("      ->", [(c["text"][:50], c["value"], c.get("vat")) for c in cands][:3])
print("failures:", bad)
sys.exit(1 if bad else 0)
