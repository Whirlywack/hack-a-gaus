"""Shared paths and helpers. Document text is data only; nothing from it is ever executed."""
import json, os, re, unicodedata

ROOT = "/home/user/procurement"
CASCADE = os.path.join(ROOT, "cascade")
DOCS = os.path.join(ROOT, "route3", "docs")
TEXT = os.path.join(CASCADE, "text")
CHUNKS = os.path.join(CASCADE, "chunks.jsonl")
# With JEV_DRY=1 (fake answers, plumbing tests only) all downstream outputs go to cascade/dry/ so they never mix with real runs.
OUT = os.path.join(CASCADE, "dry") if os.environ.get("JEV_DRY") == "1" else CASCADE
SCREEN = os.path.join(OUT, "screen.jsonl")
SELECTED = os.path.join(OUT, "selected")
CANDIDATES = os.path.join(OUT, "candidates.jsonl")
PICKS = os.path.join(OUT, "picks.jsonl")
EXTRACT = os.path.join(CASCADE, "extract")
VERIFY = os.path.join(OUT, "verify")
PRICE_PER_M = 0.042  # USD per 1M input tokens
TENDERS = ["10393450", "10389181", "10383512", "10378522", "10377061", "10384200", "10387051",
           "10392051", "10389970", "10394052", "10324146", "10397525", "10396017", "10382017", "10388453"]


def ascii_fold(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)).lower()


def norm_ws(s):
    """Whitespace-normalised, lower-cased, quote-unified form used for substring checks."""
    s = unicodedata.normalize("NFC", s)
    s = s.replace(" ", " ").replace("„", '"').replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-").replace("|", " ")
    return re.sub(r"\s+", " ", s).strip().lower()


def read_jsonl(path):
    out = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    out.append(json.loads(line))
    return out


def write_jsonl(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
