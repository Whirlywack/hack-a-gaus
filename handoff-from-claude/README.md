# Handoff from the planning session (12 Nov 2026)

Everything here was made in a Claude cloud session, which is why it was not on the Mac.
Nothing in this folder contains keys or passwords.

## data/
- `market.json`, `market.md`: every contract in the CPV 4523 family signed 2025-11-11 to 2026-11-11
  (`A_contracts`, 4,608 rows) and those signed earlier that end 2026-11-11 to 2027-11-11 (`B_contracts`, 586).
  Pulled from get.data.gov.lt (cvpp/Sutartis and cvpp/Salis) on 11 Nov 2026. `market.md` explains every field and filter.
  3,345 of the 4,608 have a buyer name; 1,006 have a buyer code but no name; 257 have no buyer.
- `jurbarkas.json`, `jurbarkas.md`, `jurbarkas_lanes.json`: 230 contracts of one buyer (Jurbarko rajono
  savivaldybės administracija, code 188713933), 2022-01-01 to 2026-11-11, found by road code OR road words in the title.
  These are the matching test cases: 90 titles with road words carry no road code (55 in division 71,
  10 street lighting, 5 matched only because "priedangai" contains "dang").
- `open-tenders-list-2026-11.json`: 120 open notices listed on the portal on 10-11 Nov (id, title, buyer, deadline).

## readings/
- `SCHEMA.md`: the record a reading must fill, and its rules (verbatim quote and file name for every finding).
- `key/`: 15 hand-checked answer keys, one per tender. Road-family tenders among them: 10383512 (footpath),
  10377061 (bus stops), 10378522 (sports ground).
- `sonnet_alone/`: the 15 readings that scored 105 of 120 fields correct, none invented (`score_sonnet_alone.md`).
  They were produced by a Sonnet model following SCHEMA.md over the text files. There is no standalone reader program.
- `score_cascade.md`: the cheaper two-step reader, 91 of 120 with 5 invented.
- `text/<tender id>/`: the documents of all 15 tenders converted to text. `docs/`: the original files of the two road tenders.

## reader/
- `fetch/fetch_tender.py`: fetches one notice page and its documents from viesiejipirkimai.lt (one request every 2.2 s).
  `extract.py`, `parse_list.py`, `step1.sh`: unpacking and listing helpers.
- `cascade/convert.py`: originals to text. `cascade/verify.py --dry-run`: the word-for-word quote check.
  The other cascade scripts belong to the two-step reader and call an external classifier that needs its own key.

## prototype/
- The clickable prototype's source (`src/`, Vite + React) in the current visual language, with `DESIGN-V2.md`.
  `src/screens/setup.tsx` holds Pradžia, the kinds-of-work step and the e-mail code screen;
  `src/ui.tsx` and `src/parts.tsx` hold the components; `src/v2.css` and `src/parts.css` the styles.
  `gaus-prototype-built.html` is the built single file.

## design-system/
- The files of the gaus Design System: `README.md` (rules), `tokens.json`, `components/bundle.css`, one folder per component.

## Edits made after the handoff
- 12 Nov 2026: in `data/market.json`, the name of Supplier 300103252 carried a phone number and an e-mail address, as the source published it.
  Both were cut, so the three rows read `UAB "GINARA AUTOSERVISAS"`. The code is unchanged and nothing joins on the name.
