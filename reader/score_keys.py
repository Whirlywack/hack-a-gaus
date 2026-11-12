"""The scoring run: the reader against the 15 hand-checked keys.

Started by hand, never by CI. Each live run costs a few USD and needs the operator's approval.

    # free: score readings already on disk (for example the handoff's sonnet_alone/)
    python reader/score_keys.py offline handoff-from-claude/readings/sonnet_alone --check --name sonnet-alone
    # free: count the tokens of every tender and estimate a run's cost
    python reader/score_keys.py estimate --model claude-sonnet-5-5
    # live: read the 15 tenders, then score them
    python reader/score_keys.py live --model claude-sonnet-5-5 --name sonnet-1
    # the outcome record over the runs: per field, any wrong or invented value
    python reader/score_keys.py outcome sonnet-1 haiku-1

The tender texts come from GAUS_TENDER_TEXT_DIR (default handoff-from-claude/readings/text, which is
gitignored). Raw live Readings go to reader/scoring_raw/ (gitignored); only the reports in
reader/scores/ are committed. Every live call is appended to reader/live_spend.json, and the run
stops before a tender that could take that total past --cap (15 USD).

The rubric is the one the earlier 105-of-120 score was judged by
(handoff-from-claude/readings/score_sonnet_alone.md and score_cascade.md):

- correct:  the decisive value matches the key
- wrong:    a different non-null value, or a partial set
- missed:   null, "unclear" or empty where the key has a value
- invented: a value or item where the key has none

The verdicts are mechanical. Every cell that is not correct is listed with its Quote and file
for the operator to judge; this script never decides whether the bar is met.
"""
import argparse
import copy
import datetime
import json
import os
import re
import unicodedata
from difflib import SequenceMatcher

import reading as reading_mod
from reading import normalise

FIELDS = [
    "qualification_requirements_set",
    "similar_contracts",
    "min_turnover",
    "certificates_or_licences",
    "named_specialists",
    "right_to_practice_required",
    "bid_security",
    "exclusion_grounds",
]

ENUM_VALUES = {
    "qualification_requirements_set": ("yes", "no"),
    "exclusion_grounds": ("espd", "declaration", "none"),
}


def _enum(record, field):
    value = record.get(field)
    return value if value in ENUM_VALUES[field] else None


def _enum_cell(field, key, reading):
    k, r = _enum(key, field), _enum(reading, field)
    if k == r:
        verdict = "correct"
    elif r is None:
        verdict = "missed"
    else:
        verdict = "wrong"
    return {"verdict": verdict, "soft": False, "key": k, "reading": r, "why": ""}


REQUIRED_FIELDS = ["similar_contracts", "min_turnover", "right_to_practice_required", "bid_security"]


def _required(record, field):
    entry = record.get(field)
    value = entry.get("required") if isinstance(entry, dict) else None
    return value if isinstance(value, bool) else None


def _verdict(k, r):
    """Verdict and softness for two decisive values, where None means nothing found.
    A soft cell has no practical effect for a bidder: an explicit "not required" against null."""
    if k == r:
        return "correct", False
    if r is None:
        return "missed", k is False
    if k is None:
        return ("wrong", True) if r is False else ("invented", False)
    return "wrong", False


# Numbers that are decisive when both the key and the Reading say the requirement applies.
THRESHOLDS = {
    "similar_contracts": ("count", "min_value_eur", "within_years"),
    "min_turnover": ("amount_eur",),
}


def _number(entry, name):
    value = entry.get(name) if isinstance(entry, dict) else None
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _required_cell(field, key, reading):
    k, r = _required(key, field), _required(reading, field)
    verdict, soft = _verdict(k, r)
    why = ""
    if verdict == "correct" and k is True:
        differ = []
        for name in THRESHOLDS.get(field, ()):
            kn, rn = _number(key.get(field), name), _number(reading.get(field), name)
            if (kn is None) != (rn is None) or (kn is not None and abs(kn - rn) >= 0.5):
                differ.append("%s: key %s, reading %s" % (name, kn, rn))
        if differ:
            verdict, why = "wrong", "; ".join(differ)
    return {"verdict": verdict, "soft": soft, "key": k, "reading": r, "why": why}


LIST_FIELDS = ["certificates_or_licences", "named_specialists"]

# Two quotes are the same finding when they share this many characters after normalising,
# or when one holds most of the other.
QUOTE_OVERLAP_CHARS = 40
QUOTE_OVERLAP_SHARE = 0.8


def _quote_overlap(a, b):
    """Share of the shorter normalised quote that the two have in common, or 0 below the bar."""
    a, b = normalise(a or ""), normalise(b or "")
    if not a or not b:
        return 0.0
    m = SequenceMatcher(None, a, b, autojunk=False).find_longest_match(0, len(a), 0, len(b))
    shorter = min(len(a), len(b))
    if m.size >= QUOTE_OVERLAP_CHARS or m.size >= QUOTE_OVERLAP_SHARE * shorter:
        return m.size / shorter
    return 0.0


# Failing a quote match, two items are the same when their names share at least this many word
# stems and this share of the shorter name's stems. Such matches are listed for the operator.
NAME_MIN_SHARED = 2
NAME_MIN_SHARE = 0.5


def _stems(text):
    folded = unicodedata.normalize("NFKD", (text or "").lower())
    folded = "".join(c for c in folded if not unicodedata.combining(c))
    return {w[:5] for w in re.findall(r"[a-z]{4,}", folded)}


def _name_similarity(a, b):
    sa, sb = _stems(a), _stems(b)
    shared = len(sa & sb)
    if shared < NAME_MIN_SHARED or not sa or not sb:
        return 0.0
    share = shared / min(len(sa), len(sb))
    return share if share >= NAME_MIN_SHARE else 0.0


def _name(item):
    return item.get("name") or item.get("role") or ""


def _pair(key_items, reading_items):
    """One-to-one matching, best pairs first: quote matches before name matches.
    Returns [(key index, reading index, how)]."""
    scored = []
    for i, k in enumerate(key_items):
        for j, r in enumerate(reading_items):
            overlap = _quote_overlap(k.get("quote"), r.get("quote"))
            if overlap:
                scored.append((1 + overlap, i, j, "quote"))
                continue
            similarity = _name_similarity(_name(k), _name(r))
            if similarity:
                scored.append((similarity, i, j, "name"))
    scored.sort(key=lambda s: -s[0])
    used_k, used_r, pairs = set(), set(), []
    for _, i, j, how in scored:
        if i not in used_k and j not in used_r:
            used_k.add(i)
            used_r.add(j)
            pairs.append((i, j, how))
    return pairs


def _items(record, field):
    return [i for i in (record.get(field) or []) if isinstance(i, dict)]


def _brief(item):
    return {"name": item.get("name") or item.get("role"), "quote": item.get("quote"), "file": item.get("file")}


# Key items that a Reading may list or leave out without effect on the score, by tender, field and
# the start of the key's quote. 10382017: the organic certificate of the offered product. The judged
# scoring counts certificates at supplier level and credited the reader for tagging this one as a
# product requirement (score_sonnet_alone.md, "Product-level vs supplier-level").
OPTIONAL_KEY_ITEMS = {
    ("10382017", "certificates_or_licences"): ["produktai turi turėti ekologinės gamybos"],
}


def _optional(tender, field, item):
    starts = OPTIONAL_KEY_ITEMS.get((str(tender), field), [])
    return any(normalise(item.get("quote") or "").startswith(normalise(s)) for s in starts)


def _list_cell(field, key, reading):
    k_items, r_items = _items(key, field), _items(reading, field)
    optional = {i for i, k in enumerate(k_items) if _optional(key.get("tender_id"), field, k)}
    pairs = _pair(k_items, r_items)
    matched_k = {i for i, _, _ in pairs}
    # reading items that matched an optional key item count neither way
    counted_r = [j for j in range(len(r_items)) if j not in {j for i, j, _ in pairs if i in optional}]
    needed = [i for i in range(len(k_items)) if i not in optional]
    unmatched_key = [_brief(k_items[i]) for i in needed if i not in matched_k]
    extra = [_brief(r_items[j]) for j in counted_r if j not in {j for _, j, _ in pairs}]
    if not needed:
        verdict = "invented" if extra else "correct"
    elif not counted_r:
        verdict = "missed"
    elif unmatched_key or extra:
        verdict = "wrong"
    else:
        verdict = "correct"
    name_only = [{"key": _brief(k_items[i]), "reading": _brief(r_items[j])} for i, j, how in pairs if how == "name"]
    return {"verdict": verdict, "soft": False, "key": len(k_items), "reading": len(r_items),
            "unmatched_key": unmatched_key, "extra": extra, "name_only": name_only}


def score_tender(key, reading):
    """{field: cell} for the eight scored fields of one tender."""
    cells = {}
    for field in ENUM_VALUES:
        cells[field] = _enum_cell(field, key, reading)
    for field in REQUIRED_FIELDS:
        cells[field] = _required_cell(field, key, reading)
    for field in LIST_FIELDS:
        cells[field] = _list_cell(field, key, reading)
    return cells


# ---------------------------------------------------------------- what is shown

STATE_TO_REQUIRED = {"required": True, "not_required": False, "not_found": None}


def shown_record(checked):
    """The record as the Reading would show it, from the output of reading.check_record (or a stored
    Reading): a single finding whose Quote was not found reads as nothing found, and a list keeps only
    the items whose Quote was found."""
    shown = copy.deepcopy(checked["record"])
    for field in REQUIRED_FIELDS:
        if checked["states"].get(field) == "not_found":
            entry = shown.get(field) if isinstance(shown.get(field), dict) else {}
            shown[field] = dict(entry, required=None, quote=None, file=None)
    for field in LIST_FIELDS:
        shown[field] = copy.deepcopy(checked["found"].get(field, []))
    return shown


# ---------------------------------------------------------------- a whole run

VERDICTS = ("correct", "wrong", "missed", "invented")


def load_records(folder):
    """{tender id: record} for every <id>.json in the folder."""
    records = {}
    for name in sorted(os.listdir(folder)):
        if name.endswith(".json"):
            with open(os.path.join(folder, name), encoding="utf-8") as f:
                records[name[:-5]] = json.load(f)
    return records


def _quote_of(record, field):
    entry = record.get(field) if record else None
    if isinstance(entry, dict):
        return entry.get("quote"), entry.get("file")
    return None, None


def score_run(keys, readings):
    """Score every keyed tender. A tender with no Reading (a failed read) scores as nothing found."""
    per_field = {f: dict.fromkeys(VERDICTS, 0) for f in FIELDS}
    cells, disagreements = {}, []
    for tender in sorted(keys):
        key = keys[tender]
        reading = readings.get(tender) or {}
        cells[tender] = score_tender(key, reading)
        for field in FIELDS:
            cell = cells[tender][field]
            per_field[field][cell["verdict"]] += 1
            if cell["verdict"] == "correct":
                continue
            kq, kf = _quote_of(key, field)
            rq, rf = _quote_of(reading, field)
            disagreements.append(dict(
                cell, tender=tender, field=field,
                key_quote=kq, key_file=kf, reading_quote=rq, reading_file=rf,
            ))
    total = {v: sum(per_field[f][v] for f in FIELDS) for v in VERDICTS}
    total["cells"] = sum(total.values())
    name_only = [dict(m, tender=t, field=f) for t in cells for f in LIST_FIELDS for m in cells[t][f]["name_only"]]
    return {"per_field": per_field, "total": total, "cells": cells, "disagreements": disagreements,
            "name_only": name_only}


# ---------------------------------------------------------------- the live run

def ledger_total(path):
    if not os.path.exists(path):
        return 0.0
    with open(path, encoding="utf-8") as f:
        return float(json.load(f).get("total_usd", 0.0))


def run_live(client, tenders, text_dir, raw_dir, model, label, ledger_path, cap_usd, today=None, log=lambda s: None):
    """Read each tender with the live model, one at a time. Before each one, its worst case (counted
    input plus max_tokens of output) is added to the ledger's running total; if that would pass the
    cap, the run stops there. Each raw Reading is saved in raw_dir (gitignored: it holds Quotes).
    No document text is logged."""
    os.makedirs(raw_dir, exist_ok=True)
    readings, failures, usage, stopped = {}, {}, {}, None
    for tender in tenders:
        readings[tender] = None
        if stopped:
            failures[tender] = stopped
            continue
        folder = os.path.join(text_dir, tender)
        counted = reading_mod._count(client, model, *reading_mod.build_prompt(reading_mod.load_texts(folder), tender))
        worst = reading_mod.usd(model, counted, reading_mod.MAX_OUTPUT)
        total = ledger_total(ledger_path)
        if total + worst > cap_usd:
            stopped = "not read: the ledger (%.4f USD) plus this tender's worst case (%.4f USD) would pass %.2f USD" % (
                total, worst, cap_usd)
            failures[tender] = stopped
            log("%s: stopped, %s" % (tender, stopped))
            continue
        log("%s: %d input tokens counted, worst case %.4f USD, ledger %.4f USD" % (tender, counted, worst, total))
        try:
            result = reading_mod.read_tender(folder, client, today=today, ledger_path=ledger_path, model=model,
                                             label=label)
        except reading_mod.ReadFailed as e:
            failures[tender] = "read failed: %s" % e
            log("%s: %s" % (tender, failures[tender]))
            continue
        except Exception as e:  # noqa: BLE001 - an API or network error; the run goes on
            failures[tender] = "call failed: %s" % type(e).__name__
            reading_mod.append_ledger(ledger_path, {
                "date": today, "label": "%s (call failed: %s; billed amount unknown, counted input charged)"
                % (label, type(e).__name__), "tender": tender, "model": model,
                "input_tokens": counted, "output_tokens": 0,
                "usd": round(reading_mod.usd(model, counted, 0), 6),
            })
            log("%s: %s" % (tender, failures[tender]))
            continue
        readings[tender] = result
        usage[tender] = dict(result["usage"], model=result["model"])
        with open(os.path.join(raw_dir, tender + ".json"), "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        log("%s: read, %d in / %d out tokens, %.4f USD" % (
            tender, result["usage"]["input_tokens"], result["usage"]["output_tokens"], result["usage"]["usd"]))
    return {"readings": readings, "failures": failures, "usage": usage, "stopped": stopped}


# ---------------------------------------------------------------- the report

# Tender documents carry the e-mail addresses and phone numbers of Buyers' contact people, and the
# repo is public. Quotes in a committed report go through this first.
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONES = [
    re.compile(r"\+370[\s\-()]*(?:\d[\s\-()]*){7,}\d"),
    re.compile(r"\(8[\s\-]?\d{1,3}\)[\s\-]*\d[\d\s\-]{4,}\d"),
    re.compile(r"(?<![\d,.])(?<!\d\s)8[\s\-]?\d{3}[\s\-]?\d{5}\b"),
]


def scrub(text):
    if not text:
        return text
    text = EMAIL.sub("[e-mail removed]", text)
    for phone in PHONES:
        text = phone.sub("[phone removed]", text)
    return text


def _q(quote, file):
    if not quote:
        return "no quote"
    return "“%s” (`%s`)" % (scrub(" ".join(quote.split())), file or "no file")


def _value(field, cell):
    if field in LIST_FIELDS:
        return "%d item(s)" % cell["key"], "%d item(s)" % cell["reading"]
    show = lambda v: "nothing found" if v is None else str(v).lower()  # noqa: E731
    return show(cell["key"]), show(cell["reading"])


def _disagreement_md(d):
    lines = ["#### %s · %s: %s%s" % (d["tender"], d["field"], d["verdict"], " (soft)" if d.get("soft") else "")]
    k, r = _value(d["field"], d)
    lines.append("Key: %s. Reading: %s.%s" % (k, r, (" Differs: %s." % d["why"]) if d.get("why") else ""))
    if d["field"] in LIST_FIELDS:
        for item in d["unmatched_key"]:
            lines.append("- Key item not in the Reading: %s: %s" % (item["name"], _q(item["quote"], item["file"])))
        for item in d["extra"]:
            lines.append("- Reading item not in the key: %s: %s" % (item["name"], _q(item["quote"], item["file"])))
    elif d["field"] in ENUM_VALUES:
        lines.append("- This field carries no Quote in the record; judge it from the documents.")
    else:
        lines.append("- Key Quote: %s" % _q(d["key_quote"], d["key_file"]))
        lines.append("- Reading Quote: %s" % _q(d["reading_quote"], d["reading_file"]))
    return "\n".join(lines)


def render_report(result, meta):
    """Markdown for the operator. meta: title, and optionally model, date, usage {tender: {...}},
    failures {tender: reason}, unfound {tender: [{field, quote}]}, notes [str]."""
    out = ["# %s" % meta["title"], "",
           "**Status: pending operator judgement.** The verdicts below are mechanical. "
           "The operator judges every disagreement; this report does not decide whether the bar "
           "(no invented finding, at least 105 of 120 correct) is met.", ""]
    for label in ("model", "date", "run_usd", "ledger_total_usd"):
        if meta.get(label) is not None:
            out.append("- %s: %s" % (label.replace("_", " "), meta[label]))
    out += [""] + ["- %s" % n for n in meta.get("notes", [])] + [""]

    out += ["## Per field", "", "| Field | Correct | Wrong | Missed | Invented |", "|---|---|---|---|---|"]
    for field in FIELDS:
        c = result["per_field"][field]
        out.append("| %s | %d | %d | %d | %d |" % (field, c["correct"], c["wrong"], c["missed"], c["invented"]))
    t = result["total"]
    out += ["| **Total** | **%d** | **%d** | **%d** | **%d** |" % (t["correct"], t["wrong"], t["missed"], t["invented"]),
            "", "Out of %d cells." % t["cells"], ""]

    out += ["## Wrong or invented values per field", ""]
    for field in FIELDS:
        bad = sorted({"%s (%s)" % (d["tender"], d["verdict"]) for d in result["disagreements"]
                      if d["field"] == field and d["verdict"] in ("wrong", "invented")})
        out.append("- %s: %s" % (field, ", ".join(bad) if bad else "none"))
    out.append("")

    if meta.get("usage") or meta.get("failures"):
        out += ["## Tokens per tender (as the API returned them)", "",
                "| Tender | Counted input | Input | Output | USD | Model that answered |", "|---|---|---|---|---|---|"]
        for tender in sorted(set(meta.get("usage", {})) | set(meta.get("failures", {}))):
            u = meta.get("usage", {}).get(tender)
            if u:
                out.append("| %s | %d | %d | %d | %.4f | %s |" % (
                    tender, u["counted_input_tokens"], u["input_tokens"], u["output_tokens"], u["usd"], u["model"]))
            else:
                out.append("| %s | | | | | failed: %s |" % (tender, meta["failures"][tender]))
        out.append("")

    out += ["## Disagreements (%d)" % len(result["disagreements"]), ""]
    for d in result["disagreements"]:
        out += [_disagreement_md(d), ""]

    if result["name_only"]:
        out += ["## Items matched by name only (counted as matching; please check)", ""]
        for m in result["name_only"]:
            out.append("- %s · %s: key %s: %s / reading %s: %s" % (
                m["tender"], m["field"], m["key"]["name"], _q(m["key"]["quote"], m["key"]["file"]),
                m["reading"]["name"], _q(m["reading"]["quote"], m["reading"]["file"])))
        out.append("")

    unfound = {t: u for t, u in (meta.get("unfound") or {}).items() if u}
    if unfound:
        out += ["## Reading quotes that failed the Quote check (scored as not found)", ""]
        for tender in sorted(unfound):
            for u in unfound[tender]:
                out.append("- %s · %s: %s" % (tender, u["field"], _q(u.get("quote"), u.get("file"))))
        out.append("")
    return "\n".join(out)


def summary(result, meta):
    """The machine-readable outcome, without Quotes: what decides which fields may be shown."""
    return {
        "status": "pending operator judgement",
        "title": meta["title"], "model": meta.get("model"), "date": meta.get("date"),
        "per_field": result["per_field"], "total": result["total"],
        "wrong_or_invented": {f: sorted({d["tender"] for d in result["disagreements"]
                                         if d["field"] == f and d["verdict"] in ("wrong", "invented")})
                              for f in FIELDS},
        "usage": meta.get("usage", {}), "failures": meta.get("failures", {}),
        "run_usd": meta.get("run_usd"), "ledger_total_usd": meta.get("ledger_total_usd"),
    }


def render_outcome(summaries, reader_model=reading_mod.MODEL):
    """The outcome record over several runs. Only runs on the reader's model decide which fields had a
    wrong or invented value; other models are listed as a comparison."""
    reader_runs = [s for s in summaries if s["model"] == reader_model]
    others = [s for s in summaries if s["model"] != reader_model]
    out = ["# Outcome of the scoring run (#13)", "",
           "**Status: pending operator judgement.** The counts are mechanical. The operator judges every "
           "disagreement in the run reports, decides whether the bar is met (no invented finding, at least "
           "105 of 120 correct), and may clear a wrong or invented value below as a key issue or a soft cell.", "",
           "## Runs", "", "| Run | Model | Correct | Wrong | Missed | Invented |", "|---|---|---|---|---|---|"]
    for s in summaries:
        t = s["total"]
        out.append("| %s | %s | %d | %d | %d | %d |" % (s["title"], s["model"], t["correct"], t["wrong"],
                                                       t["missed"], t["invented"]))
    out += ["", "## Fields with a wrong or invented value on the reader's model (%s)" % reader_model, "",
            "This decides which fields #16 may show if the bar is missed: a field is shown only if it had "
            "no wrong and no invented value on the 15 keys.", "",
            "| Field | Wrong or invented value |", "|---|---|"]
    for field in FIELDS:
        bad = ["%s (%s)" % (t, s["title"]) for s in reader_runs for t in s["wrong_or_invented"][field]]
        out.append("| %s | %s |" % (field, ("yes: " + ", ".join(bad)) if bad else "no"))
    if others:
        out += ["", "## Comparison runs (do not decide which fields are shown)", ""]
        for s in others:
            bad = ["%s: %s" % (f, ", ".join(s["wrong_or_invented"][f])) for f in FIELDS if s["wrong_or_invented"][f]]
            out.append("- %s (%s): %s" % (s["title"], s["model"], "; ".join(bad) if bad else "no wrong or invented value"))
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------- command line

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS_DIR = os.path.join(REPO, "handoff-from-claude", "readings", "key")
SCORES_DIR = os.path.join(REPO, "reader", "scores")
RAW_DIR = os.path.join(REPO, "reader", "scoring_raw")
TEXT_DIR = os.environ.get("GAUS_TENDER_TEXT_DIR", os.path.join(REPO, "handoff-from-claude", "readings", "text"))
CAP_USD = 15.0
# For the estimate only: a typical answer is a few thousand tokens; max_tokens is the worst case.
EXPECTED_OUTPUT_TOKENS = 8_000

KEY_NOTE = ("One of the 171 key Quotes is not found word for word in the converted text: 10384200 "
            "other_requirements[8] (a penalty clause). It is outside the eight scored fields, so it does "
            "not move the score; run through the Quote check, that item would read \"not found\".")


def _write(name, result, meta):
    os.makedirs(SCORES_DIR, exist_ok=True)
    md_path = os.path.join(SCORES_DIR, name + ".md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(render_report(result, meta) + "\n")
    with open(os.path.join(SCORES_DIR, name + ".json"), "w", encoding="utf-8") as f:
        json.dump(summary(result, meta), f, ensure_ascii=False, indent=2)
        f.write("\n")
    return md_path


def _client():
    import anthropic  # imported here so the tests need no SDK
    return anthropic.Anthropic(api_key=reading_mod.load_key(), max_retries=5)


def _offline(args, keys):
    records = load_records(args.folder)
    unfound = {}
    if args.check:
        checked = {t: reading_mod.check_record(r, reading_mod.load_texts(os.path.join(TEXT_DIR, t)))
                   for t, r in records.items()}
        unfound = {t: c["unfound_quotes"] for t, c in checked.items()}
        records = {t: shown_record(c) for t, c in checked.items()}
    result = score_run(keys, records)
    notes = [KEY_NOTE, "Readings scored: `%s`%s." % (os.path.relpath(args.folder, REPO),
                                                      ", after the Quote check" if args.check else "")]
    meta = {"title": "Scoring: %s against the 15 keys" % args.name, "notes": notes, "unfound": unfound}
    return result, meta


def _estimate(args, keys):
    client = _client()
    rows, total_in = [], 0
    for tender in sorted(keys):
        folder = os.path.join(TEXT_DIR, tender)
        texts = reading_mod.load_texts(folder)
        n = reading_mod._count(client, args.model, *reading_mod.build_prompt(texts, tender))
        total_in += n
        rows.append({"tender": tender, "chars": sum(len(t) for t in texts.values()), "counted_input_tokens": n,
                     "expected_usd": round(reading_mod.usd(args.model, n, EXPECTED_OUTPUT_TOKENS), 4),
                     "worst_usd": round(reading_mod.usd(args.model, n, reading_mod.MAX_OUTPUT), 4)})
        print("%s: %d chars, %d tokens counted" % (tender, rows[-1]["chars"], n))
    est = {"model": args.model, "date": datetime.date.today().isoformat(), "counted_input_tokens": total_in,
           "expected_output_tokens_per_tender": EXPECTED_OUTPUT_TOKENS, "max_output_tokens": reading_mod.MAX_OUTPUT,
           "expected_usd": round(sum(r["expected_usd"] for r in rows), 4),
           "worst_usd": round(sum(r["worst_usd"] for r in rows), 4),
           "ledger_total_usd": ledger_total(reading_mod.LEDGER_PATH), "tenders": rows}
    os.makedirs(SCORES_DIR, exist_ok=True)
    path = os.path.join(SCORES_DIR, "estimate-%s.json" % args.model)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(est, f, indent=2)
        f.write("\n")
    print("%s: %d input tokens; expected %.2f USD, worst case %.2f USD; ledger now %.4f USD; written to %s" % (
        args.model, total_in, est["expected_usd"], est["worst_usd"], est["ledger_total_usd"], path))


def _live(args, keys):
    before = ledger_total(reading_mod.LEDGER_PATH)
    run = run_live(_client(), sorted(keys), TEXT_DIR, os.path.join(RAW_DIR, args.name), model=args.model,
                   label="score %s" % args.name, ledger_path=reading_mod.LEDGER_PATH, cap_usd=args.cap,
                   today=datetime.date.today().isoformat(), log=print)
    shown = {t: shown_record(r) for t, r in run["readings"].items() if r}
    result = score_run(keys, shown)
    after = ledger_total(reading_mod.LEDGER_PATH)
    skipped = {t: r["files_skipped"] for t, r in run["readings"].items() if r and r["files_skipped"]}
    notes = [KEY_NOTE,
             "A tender whose read failed or was not made scores as nothing found.",
             "Tokens of a failed read are in reader/live_spend.json, not in the table below."]
    if skipped:
        notes.append("Files left out because they did not fit the window: %s" % json.dumps(skipped, ensure_ascii=False))
    meta = {"title": "Scoring run %s (%s) against the 15 keys" % (args.name, args.model), "model": args.model,
            "date": datetime.date.today().isoformat(), "usage": run["usage"], "failures": run["failures"],
            "unfound": {t: r["unfound_quotes"] for t, r in run["readings"].items() if r},
            "run_usd": round(after - before, 4), "ledger_total_usd": round(after, 4), "notes": notes}
    return result, meta


def main(argv=None):
    ap = argparse.ArgumentParser(description="Score the reader against the 15 hand-checked keys. Started by hand.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    off = sub.add_parser("offline", help="score readings already on disk (free)")
    off.add_argument("folder")
    off.add_argument("--name", required=True)
    off.add_argument("--check", action="store_true", help="apply the Quote check against the tender texts")
    est = sub.add_parser("estimate", help="count tokens and estimate a run's cost (free)")
    est.add_argument("--model", default=reading_mod.MODEL)
    live = sub.add_parser("live", help="read the 15 tenders with the live model, then score (costs money)")
    live.add_argument("--model", default=reading_mod.MODEL)
    live.add_argument("--name", required=True)
    live.add_argument("--cap", type=float, default=CAP_USD)
    oc = sub.add_parser("outcome", help="write reader/scores/OUTCOME.md from the named runs' summaries")
    oc.add_argument("names", nargs="+")
    args = ap.parse_args(argv)

    if args.cmd == "outcome":
        summaries = []
        for name in args.names:
            with open(os.path.join(SCORES_DIR, name + ".json"), encoding="utf-8") as f:
                summaries.append(dict(json.load(f), title=name))
        path = os.path.join(SCORES_DIR, "OUTCOME.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(render_outcome(summaries))
        return print("written to %s" % path)
    keys = load_records(KEYS_DIR)
    if args.cmd == "estimate":
        return _estimate(args, keys)
    result, meta = (_offline if args.cmd == "offline" else _live)(args, keys)
    path = _write(args.name, result, meta)
    t = result["total"]
    print("%s: %d correct, %d wrong, %d missed, %d invented of %d; report %s" % (
        args.name, t["correct"], t["wrong"], t["missed"], t["invented"], t["cells"], path))


if __name__ == "__main__":
    main()
