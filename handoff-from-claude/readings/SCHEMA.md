# Requirement record — one JSON file per tender: <tenderId>.json

Source texts: /home/user/procurement/route3/text/<tenderId>/*.txt (converted from the tender's own documents;
`_lo/` subfolders are LibreOffice duplicates of .doc files; nested EBVPD/ESPD zips were not opened; one scanned
PDF in 10383512 has no text). Original files: /home/user/procurement/route3/docs/<tenderId>/.

Report only what the documents state. A value not stated in the documents is null — never a guess, never a
"typical" value. Every non-null finding carries a verbatim Lithuanian quote (<= 300 chars) and the file name.

```json
{
  "tender_id": "10393450",
  "files_read": ["..."],
  "qualification_requirements_set": "yes | no | unclear",
  "min_turnover": {"required": true, "amount_eur": 100000, "period": "per year, last 3 financial years", "quote": "...", "file": "..."},
  "similar_contracts": {"required": true, "count": 1, "min_value_eur": 40000, "within_years": 3, "description": "what counts as similar", "quote": "...", "file": "..."},
  "certificates_or_licences": [{"name": "ISO 9001 / atestatas / licencija ...", "quote": "...", "file": "..."}],
  "named_specialists": [{"role": "statybos vadovas", "qualification": "...", "quote": "...", "file": "..."}],
  "right_to_practice_required": {"required": true, "quote": "...", "file": "..."},
  "bid_security": {"required": false, "amount": null, "quote": "...", "file": "..."},
  "exclusion_grounds": "espd | declaration | none | unclear",
  "other_requirements": [{"what": "...", "quote": "...", "file": "..."}],
  "notes": "anything ambiguous, e.g. requirements differ per lot, value given excl./incl. VAT, requirement refers to an annex that is missing"
}
```

Rules
- `required: false` needs a quote too when the documents say so explicitly (e.g. "kvalifikacijos reikalavimai netaikomi"); if the documents are silent, use `"required": null`.
- Amounts: copy the number as written into the quote; put the normalised number in the field; note VAT basis in `notes`.
- If requirements differ by lot (pirkimo dalis), record the strictest in the fields and list the per-lot values in `notes`.
- `min_value_eur` for similar contracts expressed as a share of the bid/estimated value (e.g. "ne mažesnė kaip 0,7 pasiūlymo vertės") → null in the number, the rule in `description`.
