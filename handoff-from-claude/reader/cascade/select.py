#!/usr/bin/env python3
"""Select passages for the extractor: any screening hit >= threshold plus the immediately preceding and
following passage (same file) as context, in document order.
  python3 -I select.py [--threshold 0.5]
Output: selected/<id>.txt (for the extractor), selected/<id>.jsonl (machine-readable), selected/summary.json"""
import argparse, json, os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))  # append, not insert: select.py must not shadow stdlib select
from common import *
from screen import HIT_KEYS, derive


def hit_info(row, T):
    """Return (is_hit, [(key, prob)] sorted desc for keys >= T). Unscreened (error) rows count as hits."""
    if row is None:
        return False, []
    if row.get("error"):
        return True, [("ERROR-unscreened", 1.0)]
    p = dict(row["p"])
    p["cert_supplier"] = 1.0 if derive(p, T) else 0.0
    hits = sorted(((k, p.get(k) or 0.0) for k in HIT_KEYS if (p.get(k) or 0.0) >= T), key=lambda kv: -kv[1])
    return bool(hits), hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--threshold", type=float, default=0.5)
    a = ap.parse_args()
    chunks = read_jsonl(CHUNKS)
    scr = {r["id"]: r for r in read_jsonl(SCREEN)}
    if not scr:
        sys.exit("no screening results in %s - run screen.py first" % SCREEN)
    os.makedirs(SELECTED, exist_ok=True)
    summary = {}
    for tid in TENDERS:
        cs = [c for c in chunks if c["tender"] == tid]
        cs.sort(key=lambda c: (c["file_index"], c["n"]))
        info = [hit_info(scr.get(c["id"]), a.threshold) for c in cs]
        role = {}
        for i, (is_hit, _) in enumerate(info):
            if is_hit:
                role[i] = "HIT"
                for j in (i - 1, i + 1):
                    if 0 <= j < len(cs) and cs[j]["file_index"] == cs[i]["file_index"] and j not in role:
                        role[j] = "context"
        # a context passage that is itself a hit must stay HIT
        for i, (is_hit, _) in enumerate(info):
            if is_hit:
                role[i] = "HIT"
        txt, recs, nchars = [], [], 0
        for i in sorted(role):
            c = cs[i]
            tops = " ".join("%s=%.2f" % kv for kv in info[i][1][:4]) or "-"
            txt.append("##### %s | passage %s | %s | top: %s\n%s\n" % (c["file"], c["id"], role[i], tops, c["text"]))
            recs.append({"id": c["id"], "file": c["file"], "role": role[i], "top": info[i][1][:4], "text": c["text"]})
            nchars += c["chars"]
        with open(os.path.join(SELECTED, tid + ".txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(txt))
        write_jsonl(os.path.join(SELECTED, tid + ".jsonl"), recs)
        summary[tid] = {"passages": len(cs), "selected": len(role), "hits": sum(1 for r in role.values() if r == "HIT"), "chars": nchars}
        s = summary[tid]
        print("%s: %d -> %d selected (%d hits), %d chars" % (tid, s["passages"], s["selected"], s["hits"], s["chars"]))
    json.dump(summary, open(os.path.join(SELECTED, "summary.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
