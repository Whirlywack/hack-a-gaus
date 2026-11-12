#!/usr/bin/env python3
"""Small client for the Jev (TypeSafe System One) API. Standard library only.

Key: env TYPESAFE_API_KEY, or the file whose path is in env TYPESAFE_KEY_FILE. Never printed, never stored.
Env JEV_DRY=1 returns deterministic FAKE answers with no network (for plumbing tests only).
  python3 -I jev_client.py --selftest     # ONE tiny real request (needs key)
"""
import hashlib, json, os, random, ssl, sys, threading, time
import urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.append(os.path.dirname(os.path.abspath(__file__)))  # append, not insert: select.py must not shadow stdlib select
from common import CASCADE

URL = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-1.13.0"
CACHE_PATH = os.environ.get("JEV_CACHE", os.path.join(CASCADE, "cache", "jev_cache.jsonl"))
_lock = threading.Lock()
_cache = None
STATS = {"calls": 0, "cache_hits": 0, "errors": 0, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}


class JevError(Exception):
    pass


def _key():
    k = os.environ.get("TYPESAFE_API_KEY")
    if not k and os.environ.get("TYPESAFE_KEY_FILE"):
        with open(os.environ["TYPESAFE_KEY_FILE"], encoding="utf-8") as f:
            k = f.read()
    k = (k or "").strip()
    if not k:
        raise JevError("No API key: set TYPESAFE_API_KEY or TYPESAFE_KEY_FILE")
    return k


def _ctx():
    for p in (os.environ.get("SSL_CERT_FILE"), os.environ.get("REQUESTS_CA_BUNDLE"), "/root/.ccr/ca-bundle.crt"):
        if p and os.path.exists(p):
            return ssl.create_default_context(cafile=p)
    return ssl.create_default_context()


def cache_key(model, state, questions):
    blob = json.dumps([model, state, questions], sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def _load_cache():
    global _cache
    if _cache is None:
        _cache = {}
        if os.path.exists(CACHE_PATH):
            with open(CACHE_PATH, encoding="utf-8") as f:
                for line in f:
                    try:
                        r = json.loads(line)
                        _cache[r["k"]] = r["v"]
                    except Exception:
                        pass
    return _cache


def _cache_put(k, v):
    with _lock:
        _cache[k] = v
        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        with open(CACHE_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps({"k": k, "v": v}, ensure_ascii=False) + "\n")


def _add_usage(u):
    if not isinstance(u, dict):
        return
    def pick(*names):
        for n in names:
            if isinstance(u.get(n), (int, float)):
                return int(u[n])
        return 0
    with _lock:
        STATS["input_tokens"] += pick("input_tokens", "prompt_tokens", "tokens_in")
        STATS["output_tokens"] += pick("output_tokens", "completion_tokens", "tokens_out")
        STATS["total_tokens"] += pick("total_tokens")


def _fake(questions):
    ans = {}
    for qid, q in questions.items():
        h = int(hashlib.sha256(qid.encode()).hexdigest(), 16)
        if q.get("type") == "choice":
            opts = list(q["criteria"])
            ans[qid] = {"type": "choice", "choice": opts[h % len(opts)], "probabilities": {o: 1.0 / len(opts) for o in opts}, "confidence": 0.0}
        else:
            ans[qid] = {"type": "noul", "noul": (h % 100) / 100.0}
    return {"answers": ans, "usage": {"input_tokens": 0}, "dry": True}


def decide(state, questions, model=MODEL, timeout=120, retries=6, use_cache=True):
    """Return the full response dict {"answers": ..., "usage": ...}. Raises JevError."""
    if os.environ.get("JEV_DRY") == "1":
        return _fake(questions)
    k = cache_key(model, state, questions)
    if use_cache:
        with _lock:
            hit = _load_cache().get(k)
        if hit is not None:
            with _lock:
                STATS["cache_hits"] += 1
            return hit
    if len(state) / 3 > 60000:
        raise JevError("state too long (~%d tokens, limit 64k)" % (len(state) // 3))
    body = json.dumps({"model": model, "state": state, "questions": questions}, ensure_ascii=False).encode("utf-8")
    key = _key()
    last = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(URL, data=body, method="POST", headers={
            "Authorization": "Bearer " + key, "Content-Type": "application/json", "Accept": "application/json"})
        wait = None
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=_ctx()) as r:
                resp = json.loads(r.read().decode("utf-8"))
            with _lock:
                STATS["calls"] += 1
            _add_usage(resp.get("usage"))
            if use_cache:
                _cache_put(k, resp)
            return resp
        except urllib.error.HTTPError as e:
            code = e.code
            detail = e.read().decode("utf-8", "replace")[:300].replace(key, "***")
            last = "HTTP %d %s" % (code, detail)
            if code == 429 or code >= 500:
                try:
                    wait = float(e.headers.get("Retry-After"))
                except (TypeError, ValueError):
                    wait = None
            else:
                with _lock:
                    STATS["errors"] += 1
                raise JevError(last)
        except (urllib.error.URLError, TimeoutError, ConnectionError, ssl.SSLError, json.JSONDecodeError) as e:
            last = "%s: %s" % (type(e).__name__, str(e).replace(key, "***")[:200])
        if attempt < retries:
            time.sleep(wait if wait is not None else min(60, 2 ** attempt + random.random()))
    with _lock:
        STATS["errors"] += 1
    raise JevError("giving up after %d retries: %s" % (retries, last))


def decide_many(requests, workers=6, model=MODEL, progress=True):
    """requests: list of {"id", "state", "questions"}. Returns {id: response dict | {"error": str}}."""
    out, done = {}, 0
    def one(r):
        try:
            return r["id"], decide(r["state"], r["questions"], model=model)
        except Exception as e:
            return r["id"], {"error": "%s: %s" % (type(e).__name__, e)}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(one, r) for r in requests]
        for f in as_completed(futs):
            i, res = f.result()
            out[i] = res
            done += 1
            if progress and (done % 50 == 0 or done == len(requests)):
                print("  %d/%d  %s" % (done, len(requests), totals()), file=sys.stderr, flush=True)
    return out


def totals():
    return "calls=%(calls)d cache_hits=%(cache_hits)d errors=%(errors)d input_tokens=%(input_tokens)d" % STATS


# ---- helpers for building questions / reading answers ----
def noul_q(instructions, true, false):
    return {"type": "noul", "instructions": instructions, "criteria": {"true": true, "false": false}}


def choice_q(instructions, options):
    return {"type": "choice", "instructions": instructions, "criteria": options}


def prob(resp, qid, default=None):
    a = (resp or {}).get("answers", {}).get(qid)
    if not a or "noul" not in a:
        return default
    return float(a["noul"])


def _selftest():
    q = {"sky": noul_q("Does the text state that the sky is blue?",
                       "The text says the sky is blue.", "The text does not say the sky is blue.")}
    resp = decide("On a clear day the sky is blue.", q, use_cache=False)
    p = prob(resp, "sky")
    print("P(sky is blue) = %s   (expect close to 1)" % p)
    print(totals())
    return 0 if p is not None and p > 0.5 else 1


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(_selftest())
    print(__doc__)
