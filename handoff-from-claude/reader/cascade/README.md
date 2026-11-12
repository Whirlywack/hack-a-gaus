# Cascade test: scripts and run order

All scripts: `python3 -I`, standard library + python-docx; run from anywhere. Document text is data only and is never executed.
Layout: `cascade/text/<id>/` converted text, `cascade/manifest.json`, `cascade/chunks.jsonl`, `cascade/screen.jsonl`,
`cascade/selected/`, `cascade/candidates.jsonl`, `cascade/picks.jsonl`, `cascade/extract/<id>.json` (written by the extractor),
`cascade/verify/<id>.json`, `cascade/cache/jev_cache.jsonl` (API response cache).

## Key (never printed or stored by the scripts)
    export TYPESAFE_KEY_FILE=/path/to/keyfile      # or: export TYPESAFE_API_KEY=...
    cd /home/user/procurement/cascade/scripts

## Run order
1. No API needed (already run):
       python3 -I convert.py            # originals -> text/<id>/*.txt (tables in place) + manifest.json
       python3 -I chunk.py              # -> chunks.jsonl
       python3 -I screen.py --dry-run   # request count, 2 sample requests, token/cost estimate
       python3 -I candidates.py --selftest ; python3 -I test_regex.py
2. Once the key exists:
       python3 -I jev_client.py --selftest        # ONE tiny request (sky is blue); expect probability near 1
       python3 -I screen.py                       # pass 1, ~1,039 calls; resumable (re-run continues; cache avoids repeat spend)
       python3 -I select.py --threshold 0.5       # -> selected/<id>.txt (+ .jsonl, summary.json)
3. Extractor (fills SCHEMA.md records) reads selected/<id>.txt and writes extract/<id>.json.
4. Optional value picks, then verification:
       python3 -I candidates.py --threshold 0.5   # -> candidates.jsonl
       python3 -I pick.py                         # -> picks.jsonl (choice + "does any option answer" companion)
       python3 -I verify.py --dry-run             # quote check only, prints requests, no API
       python3 -I verify.py [--tender ID ...] [--escalate 0.7]   # -> verify/<id>.json with `escalate` list

## Notes
- `JEV_DRY=1` makes the client return FAKE deterministic answers (no network); all downstream outputs then go to `cascade/dry/`
  so they can never mix with real results. Use it only to test plumbing.
- `scripts/sample_extract/10382017.json` is a tiny synthetic record (one quote deliberately invented) for
  `verify.py --extract-dir ../scripts/sample_extract --tender 10382017 --dry-run`.
- Tune: thresholds in `select.py --threshold`, cert rule `screen.T_CERT`, `verify.py --escalate`.
- Tables of one row are never split by `chunk.py`; a few single rows are therefore longer than 2,500 chars.
