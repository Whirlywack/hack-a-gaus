# Scoring run sonnet-1 (claude-sonnet-5-5) against the 15 keys

**Status: pending operator judgement.** The verdicts below are mechanical. The operator judges every disagreement; this report does not decide whether the bar (no invented finding, at least 105 of 120 correct) is met.

- model: claude-sonnet-5-5
- date: 2026-11-12
- run usd: 4.9521
- ledger total usd: 4.9731

- Reader: reader at d0c5b7b: reader/reading.py as on ticket-13 commit 5beb1d0, which is d0c5b7b plus per-model pricing, the usage field and no fallback for Haiku; the Sonnet prompt and request are those of d0c5b7b.
- One of the 171 key Quotes is not found word for word in the converted text: 10384200 other_requirements[8] (a penalty clause). It is outside the eight scored fields, so it does not move the score; run through the Quote check, that item would read "not found".
- A tender whose read failed or was not made scores as nothing found.
- Tokens of a failed read are in reader/live_spend.json, not in the table below.

## Per field

| Field | Correct | Wrong | Missed | Invented |
|---|---|---|---|---|
| qualification_requirements_set | 15 | 0 | 0 | 0 |
| similar_contracts | 14 | 0 | 1 | 0 |
| min_turnover | 15 | 0 | 0 | 0 |
| certificates_or_licences | 9 | 1 | 4 | 1 |
| named_specialists | 15 | 0 | 0 | 0 |
| right_to_practice_required | 10 | 0 | 3 | 2 |
| bid_security | 14 | 0 | 1 | 0 |
| exclusion_grounds | 15 | 0 | 0 | 0 |
| **Total** | **107** | **1** | **9** | **3** |

Out of 120 cells.

## Wrong or invented values per field

- qualification_requirements_set: none
- similar_contracts: none
- min_turnover: none
- certificates_or_licences: 10377061 (wrong), 10393450 (invented)
- named_specialists: none
- right_to_practice_required: 10383512 (invented), 10389181 (invented)
- bid_security: none
- exclusion_grounds: none

## Tokens per tender (as the API returned them)

| Tender | Counted input | Input | Output | USD | Model that answered |
|---|---|---|---|---|---|
| 10324146 | 143274 | 144992 | 4810 | 0.3381 | claude-sonnet-5-5 |
| 10377061 | 98974 | 100692 | 4371 | 0.2451 | claude-sonnet-5-5 |
| 10378522 | 78493 | 80211 | 1494 | 0.1754 | claude-sonnet-5-5 |
| 10382017 | 132044 | 133762 | 3875 | 0.3063 | claude-sonnet-5-5 |
| 10383512 | 144566 | 146284 | 3802 | 0.3306 | claude-sonnet-5-5 |
| 10384200 | 226000 | 227718 | 3612 | 0.4916 | claude-sonnet-5-5 |
| 10387051 | 46793 | 48511 | 2552 | 0.1225 | claude-sonnet-5-5 |
| 10388453 | 12438 | 14156 | 1428 | 0.0426 | claude-sonnet-5-5 |
| 10389181 | 71628 | 73346 | 4117 | 0.1879 | claude-sonnet-5-5 |
| 10389970 | 100165 | 101883 | 1312 | 0.2169 | claude-sonnet-5-5 |
| 10392051 | 839886 | 841604 | 2262 | 1.7058 | claude-sonnet-5-5 |
| 10393450 | 28881 | 30599 | 1699 | 0.0782 | claude-sonnet-5-5 |
| 10394052 | 45917 | 47635 | 2072 | 0.1160 | claude-sonnet-5-5 |
| 10396017 | 54502 | 56220 | 1272 | 0.1252 | claude-sonnet-5-5 |
| 10397525 | 222368 | 224086 | 2189 | 0.4701 | claude-sonnet-5-5 |

## Disagreements (13)

#### 10324146 · bid_security: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Pasiūlymo galiojimo užtikrinimas pirkimo dalyviui grąžinamas (arba atsisakoma teisių į jį) per | NETAIKOMA” (`10370150_1 priedas_Terminai.docx.txt`)
- Reading Quote: no quote

#### 10377061 · certificates_or_licences: wrong
Key: 2 item(s). Reading: 1 item(s).
- Key item not in the Reading: Specialists' kvalifikacijos atestatai (SSVA / Architektų rūmai) for exceptional-structure construction manager and design manager, roads and streets: “SSVA (iki 2022-04-30 SPSC) ir/ar Architektų rūmų išduoti kvalifikacijos atestatai” (`10377247_Pirkimas Nr. 3__4 priedas. Kvalifikacijos reikalavimai.docx.txt`)

#### 10378522 · right_to_practice_required: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Tiekėjams nenustatomi reikalavimai dėl kvalifikacijos ir kokybės vadybos sistemos standartų laikymosi.” (`10378879_Pirkimo dokumentai___Specialiosios prikimo sąlygos002.docx.txt`)
- Reading Quote: no quote

#### 10383512 · certificates_or_licences: missed
Key: 1 item(s). Reading: 0 item(s).
- Key item not in the Reading: Geodezininko kvalifikacijos pažymėjimas (specialist's, issued by Nacionalinė žemės tarnyba): “dėl b) punkte nurodyto specialisto pateikiamas Nacionalinės žemės tarnybos prie Aplinkos ministerijos išduoto kvalifikacijos pažymėjimo (arba lygiaverčio dokumento) kopijos.” (`10383897_Skelbiamos_apklausos_specialiosios_salygos.docx.txt`)

#### 10383512 · right_to_practice_required: invented
Key: nothing found. Reading: true.
- Key Quote: no quote
- Reading Quote: “Tiekėjas, teikdamas pasiūlymą, įsipareigoja, kad sutartį vykdys tik teisę verstis atitinkama veikla turintys asmenys.” (`10383897_Skelbiamos_apklausos_specialiosios_salygos.docx.txt`)

#### 10387051 · certificates_or_licences: missed
Key: 1 item(s). Reading: 0 item(s).
- Key item not in the Reading: Matininko kvalifikacijos pažymėjimas (specialist's surveyor qualification certificate, valid): “Tiekėjas privalo pasiūlyti bent 1 (vieną) specialistą, turintį galiojantį matininko kvalifikacijos pažymėjimą.” (`10387139_Pirkimo dokumentai__2026-11-09 Skelbiamos apklausos sąlygos.docx.txt`)

#### 10389181 · certificates_or_licences: missed
Key: 1 item(s). Reading: 0 item(s).
- Key item not in the Reading: Specialist's kvalifikacijos atestatas (special construction works manager, cultural-heritage endorsement) issued by SSVA: “Kvalifikacijos atestate, išduotame po 2017 m. sausio 1 d. turi būti įrašyta „taip pat minėti statiniai, esantys kultūros paveldo objekto teritorijoje, jo apsaugos zonoje, kultūros paveldo vietovėje“.” (`10389336_21737-1105.2__Priedas_8_Kvalifikacijos ir kiti reikalavimai tiek_jui Violeta.docx.txt`)

#### 10389181 · right_to_practice_required: invented
Key: nothing found. Reading: true.
- Key Quote: no quote
- Reading Quote: “Tiekėjas privalo turėti bent 1 (vieną) specialistą turinčio teisę eiti ypatingojo” (`10389336_21737-1105.2__Priedas_8_Kvalifikacijos ir kiti reikalavimai tiek_jui Violeta.docx.txt`)

#### 10392051 · certificates_or_licences: missed
Key: 1 item(s). Reading: 0 item(s).
- Key item not in the Reading: Proof of renewable electricity use OR environmental management system LST EN ISO 14001 / equivalent (technical specification requirement): “TEIKĖJAS turi patvirtinti dokumentu, kad veikloje naudoja elektros energiją iš atsinaujinančiųjų energijos išteklių arba turi taikyti aplinkos apsaugos vadybos sistemos reikalavimus pagal standartą LST EN ISO 14001” (`10392135_1. priedas Technine specifikacija.doc.txt`)

#### 10392051 · right_to_practice_required: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “3.1. Perkančioji organizacija nenustato tiekėjo pašalinimo pagrindų, reikalavimų kvalifikacijai bei nereikalauja, kad tiekėjas laikytųsi kokybės vadybos sistemos ir (arba) aplinkos apsaugos vadybos sistemos standartų (toliau – Reikalavimai tiekėjui).” (`10392183_ISP-38 pirkimo salygos.doc.pdf.txt`)
- Reading Quote: no quote

#### 10393450 · certificates_or_licences: invented
Key: 0 item(s). Reading: 1 item(s).
- Reading item not in the key: Kokybės vadybos ir (arba) aplinkos apsaugos vadybos sistemos standartai nereikalaujami: “Perkančioji organizacija nereikalauja kokybės vadybos sistemos ir (arba) aplinkos apsaugos vadybos sistemos standartų taikymo.” (`10393866_Skelbiamos apklausos pirkimo sąlygos.docx.txt`)

#### 10393450 · right_to_practice_required: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “3.1. Perkančioji organizacija netaiko kvalifikacijos reikalavimų.” (`10393866_Skelbiamos apklausos pirkimo sąlygos.docx.txt`)
- Reading Quote: no quote

#### 10397525 · similar_contracts: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Techninio ir profesinio pajėgumo reikalavimai | Techninio ir profesinio pajėgumo reikalavimai | Techninio ir profesinio pajėgumo reikalavimai 1. | Netaikoma | Netaikoma” (`10397674_Pirkimo dokumentai.docx.txt`)
- Reading Quote: no quote

## Reading quotes that failed the Quote check (scored as not found)

- 10378522 · right_to_practice_required: “Tiekėjas, teikdamas pasiūlymą, įsipareigoja, kad sutartį vykdys tik teisę verstis atitinkama veikla turinčius asmenys.” (`10378879_Pirkimo dokumentai___Specialiosios prikimo sąlygos002.docx.txt`)
- 10383512 · other_requirements[2]: “3 mėn. nuo pasiūlymų pateikimo galutinio termino pabaigos.” (`10383860_Skelbiamos_apklausos_specialiosios_salygos (9).pdf.txt`)
- 10397525 · similar_contracts: “Netaikoma” (`10397674_Pirkimo dokumentai.docx.txt`)

