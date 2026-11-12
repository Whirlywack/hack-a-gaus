# Scoring run sonnet-2 (claude-sonnet-5-5) against the 15 keys

**Status: pending operator judgement.** The verdicts below are mechanical. The operator judges every disagreement; this report does not decide whether the bar (no invented finding, at least 105 of 120 correct) is met.

- model: claude-sonnet-5-5
- date: 2026-11-12
- run usd: 4.9636
- ledger total usd: 11.0536

- Reader: reader as merged to main at 825b917 (review-4), run from ticket-13 commit a9a62c0, which adds per-model pricing, the usage field and no fallback for Haiku.
- One of the 171 key Quotes is not found word for word in the converted text: 10384200 other_requirements[8] (a penalty clause). It is outside the eight scored fields, so it does not move the score; run through the Quote check, that item would read "not found".
- Scoring rules: items of a list field match by Quote (40 shared characters, or 80% of the shorter Quote), failing that by name (listed below for checking). 10382017's organic certificate is product-level, as judged in score_sonnet_alone.md: a Reading may list it or not. A tender whose read failed or was not made scores as nothing found.
- Tokens of a failed read are in reader/live_spend.json, not in the table below.

## Per field

| Field | Correct | Wrong | Missed | Invented |
|---|---|---|---|---|
| qualification_requirements_set | 15 | 0 | 0 | 0 |
| similar_contracts | 15 | 0 | 0 | 0 |
| min_turnover | 15 | 0 | 0 | 0 |
| certificates_or_licences | 12 | 2 | 1 | 0 |
| named_specialists | 14 | 1 | 0 | 0 |
| right_to_practice_required | 11 | 3 | 0 | 1 |
| bid_security | 15 | 0 | 0 | 0 |
| exclusion_grounds | 15 | 0 | 0 | 0 |
| **Total** | **112** | **6** | **1** | **1** |

Out of 120 cells.

## Wrong or invented values per field

- qualification_requirements_set: none
- similar_contracts: none
- min_turnover: none
- certificates_or_licences: 10324146 (wrong), 10377061 (wrong)
- named_specialists: 10324146 (wrong)
- right_to_practice_required: 10378522 (wrong), 10383512 (invented), 10392051 (wrong), 10393450 (wrong)
- bid_security: none
- exclusion_grounds: none

## Tokens per tender (as the API returned them)

| Tender | Counted input | Input | Output | USD | Model that answered |
|---|---|---|---|---|---|
| 10324146 | 143344 | 145062 | 5044 | 0.3406 | claude-sonnet-5-5 |
| 10377061 | 99055 | 100773 | 4456 | 0.2461 | claude-sonnet-5-5 |
| 10378522 | 78558 | 80276 | 2643 | 0.1870 | claude-sonnet-5-5 |
| 10382017 | 132104 | 133822 | 3559 | 0.3032 | claude-sonnet-5-5 |
| 10383512 | 144643 | 146361 | 3485 | 0.3276 | claude-sonnet-5-5 |
| 10384200 | 226078 | 227796 | 3088 | 0.4865 | claude-sonnet-5-5 |
| 10387051 | 46831 | 48549 | 2353 | 0.1206 | claude-sonnet-5-5 |
| 10388453 | 12520 | 14238 | 1219 | 0.0407 | claude-sonnet-5-5 |
| 10389181 | 71728 | 73446 | 3470 | 0.1816 | claude-sonnet-5-5 |
| 10389970 | 100259 | 101977 | 1256 | 0.2165 | claude-sonnet-5-5 |
| 10392051 | 840001 | 841719 | 3462 | 1.7181 | claude-sonnet-5-5 |
| 10393450 | 28930 | 30648 | 1302 | 0.0743 | claude-sonnet-5-5 |
| 10394052 | 46003 | 47721 | 2577 | 0.1212 | claude-sonnet-5-5 |
| 10396017 | 54572 | 56290 | 1118 | 0.1238 | claude-sonnet-5-5 |
| 10397525 | 222432 | 224150 | 2759 | 0.4759 | claude-sonnet-5-5 |

## Disagreements (8)

#### 10324146 · certificates_or_licences: wrong
Key: 2 item(s). Reading: 1 item(s).
- Key item not in the Reading: Valid IATA certificate (or equivalent) of the specialist(s) who will provide the services: “Tiekėjas turi turėti arba pasitelkti specialistą (-us), turintį (-čius) galiojantį IATA sertifikatą arba lygiavertį dokumentą” (`10370153_4 priedas_Kvalifikacijos reikalavimai.docx.txt`)

#### 10324146 · named_specialists: wrong
Key: 1 item(s). Reading: 2 item(s).
- Reading item not in the key: Specialistas (-ai), tiesiogiai teikiantis (-ys) kelionių organizavimo paslaugas: “Tiekėjas turi turėti arba pasitelkti specialistą (-us), turintį (-čius) galiojantį IATA sertifikatą arba lygiavertį dokumentą” (`10370153_4 priedas_Kvalifikacijos reikalavimai.docx.txt`)

#### 10377061 · certificates_or_licences: wrong
Key: 2 item(s). Reading: 1 item(s).
- Key item not in the Reading: Specialists' kvalifikacijos atestatai (SSVA / Architektų rūmai) for exceptional-structure construction manager and design manager, roads and streets: “SSVA (iki 2022-04-30 SPSC) ir/ar Architektų rūmų išduoti kvalifikacijos atestatai” (`10377247_Pirkimas Nr. 3__4 priedas. Kvalifikacijos reikalavimai.docx.txt`)

#### 10378522 · right_to_practice_required: wrong
Key: false. Reading: true.
- Key Quote: “Tiekėjams nenustatomi reikalavimai dėl kvalifikacijos ir kokybės vadybos sistemos standartų laikymosi.” (`10378879_Pirkimo dokumentai___Specialiosios prikimo sąlygos002.docx.txt`)
- Reading Quote: “Tiekėjas, teikdamas pasiūlymą, įsipareigoja, kad sutartį vykdys tik teisę verstis atitinkama veikla turintys asmenys.” (`10378879_Pirkimo dokumentai___Specialiosios prikimo sąlygos002.docx.txt`)

#### 10383512 · right_to_practice_required: invented
Key: nothing found. Reading: true.
- Key Quote: no quote
- Reading Quote: “Tiekėjas, teikdamas pasiūlymą, įsipareigoja, kad sutartį vykdys tik teisę verstis atitinkama veikla turintys asmenys.” (`10383897_Skelbiamos_apklausos_specialiosios_salygos.docx.txt`)

#### 10389181 · certificates_or_licences: missed
Key: 1 item(s). Reading: 0 item(s).
- Key item not in the Reading: Specialist's kvalifikacijos atestatas (special construction works manager, cultural-heritage endorsement) issued by SSVA: “Kvalifikacijos atestate, išduotame po 2017 m. sausio 1 d. turi būti įrašyta „taip pat minėti statiniai, esantys kultūros paveldo objekto teritorijoje, jo apsaugos zonoje, kultūros paveldo vietovėje“.” (`10389336_21737-1105.2__Priedas_8_Kvalifikacijos ir kiti reikalavimai tiek_jui Violeta.docx.txt`)

#### 10392051 · right_to_practice_required: wrong
Key: false. Reading: true.
- Key Quote: “3.1. Perkančioji organizacija nenustato tiekėjo pašalinimo pagrindų, reikalavimų kvalifikacijai bei nereikalauja, kad tiekėjas laikytųsi kokybės vadybos sistemos ir (arba) aplinkos apsaugos vadybos sistemos standartų (toliau – Reikalavimai tiekėjui).” (`10392183_ISP-38 pirkimo salygos.doc.pdf.txt`)
- Reading Quote: “PIRKĖJUI pareikalavus, TEIKĖJAS pateikia teisę atlikti atitinkamus darbus patvirtinančius dokumentus.” (`10392135_1. priedas Technine specifikacija.doc.txt`)

#### 10393450 · right_to_practice_required: wrong
Key: false. Reading: true.
- Key Quote: “3.1. Perkančioji organizacija netaiko kvalifikacijos reikalavimų.” (`10393866_Skelbiamos apklausos pirkimo sąlygos.docx.txt`)
- Reading Quote: “Jeigu tiekėjo kvalifikacija dėl teisės verstis atitinkama veikla nebuvo tikrinama arba tikrinama ne visa apimtimi, tiekėjas perkančiajai organizacijai įsipareigoja, kad pirkimo sutartį vykdys tik tokią teisę turintys asmenys.” (`10393866_Skelbiamos apklausos pirkimo sąlygos.docx.txt`)

## Items matched by name only (counted as matching; please check)

- 10383512 · certificates_or_licences: key Geodezininko kvalifikacijos pažymėjimas (specialist's, issued by Nacionalinė žemės tarnyba): “dėl b) punkte nurodyto specialisto pateikiamas Nacionalinės žemės tarnybos prie Aplinkos ministerijos išduoto kvalifikacijos pažymėjimo (arba lygiaverčio dokumento) kopijos.” (`10383897_Skelbiamos_apklausos_specialiosios_salygos.docx.txt`) / reading Geodezininko kvalifikacijos pažymėjimas (specialistui): “specialistą, turintį geodezininko kvalifikacijos pažymėjimą” (`10383897_Skelbiamos_apklausos_specialiosios_salygos.docx.txt`)

## Reading quotes that failed the Quote check (scored as not found)

- 10389970 · other_requirements[0]: “Pasiūlymas turi galioti ne trumpesnėn kaip 60 dienų.” (`10390104_pirkimo dok..docx.txt`)

