#!/usr/bin/env python3
"""Run the Jev `choice` picks (similar-contract value, year window, turnover amount) over candidates.jsonl.
  python3 -I pick.py [--workers 6] [--accept 0.5]      -> picks.jsonl  (needs key; resumable via cache)"""
import argparse, json, os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from common import *
import jev_client as jev
from candidates import build_pick_request


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--accept", type=float, default=0.5, help="min companion probability to accept a pick")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    text = {}
    for tid in TENDERS:
        for r in read_jsonl(os.path.join(SELECTED, tid + ".jsonl")):
            text[r["id"]] = r["text"]
    reqs, meta = [], {}
    for c in read_jsonl(CANDIDATES):
        for task in c["tasks"]:
            built = build_pick_request(task, text[c["id"]], c["candidates"])
            if not built:
                continue
            qs, options = built
            rid = "%s|%s" % (c["id"], task)
            reqs.append({"id": rid, "state": text[c["id"]], "questions": qs})
            meta[rid] = (c, task, options)
    print("%d pick requests" % len(reqs), file=sys.stderr)
    if a.dry_run:
        for r in reqs[:2]:
            print(json.dumps(dict(r, state=r["state"][:200] + "..."), ensure_ascii=False, indent=1))
        return
    res = jev.decide_many(reqs, workers=a.workers)
    rows = []
    for rid, resp in res.items():
        c, task, options = meta[rid]
        row = {"id": c["id"], "tender": c["tender"], "task": task,
               "options": {k: {"text": o["text"], "value": o["value"], "vat": o.get("vat")} for k, o in options.items()}}
        if "error" in resp:
            row["error"] = resp["error"]
        else:
            ans = resp["answers"]
            row["any_prob"] = jev.prob(resp, "any_" + task)
            ch = ans.get("pick_" + task)
            if ch:
                row["choice"], row["probabilities"], row["confidence"] = ch.get("choice"), ch.get("probabilities"), ch.get("confidence")
            elif len(options) == 1:
                row["choice"] = next(iter(options))
            row["accepted"] = bool(row["any_prob"] is not None and row["any_prob"] >= a.accept and row.get("choice") in options)
            row["value"] = options[row["choice"]]["value"] if row.get("choice") in options else None
        rows.append(row)
    write_jsonl(PICKS, rows)
    print("wrote %d picks (%d accepted) -> %s; %s" % (len(rows), sum(1 for r in rows if r.get("accepted")), PICKS, jev.totals()), file=sys.stderr)


if __name__ == "__main__":
    main()
