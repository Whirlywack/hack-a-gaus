# Scoring run haiku-1 (claude-haiku-5-5) against the 15 keys

**Status: pending operator judgement.** The verdicts below are mechanical. The operator judges every disagreement; this report does not decide whether the bar (no invented finding, at least 105 of 120 correct) is met.

- model: claude-haiku-5-5
- date: 2026-11-12
- run usd: 1.1169
- ledger total usd: 11.0536

- Reader: reader as merged to main at 825b917 (review-4), run from ticket-13 commit a9a62c0, which adds per-model pricing, the usage field and no fallback for Haiku; on Haiku the request has no server-side fallback.
- One of the 171 key Quotes is not found word for word in the converted text: 10384200 other_requirements[8] (a penalty clause). It is outside the eight scored fields, so it does not move the score; run through the Quote check, that item would read "not found".
- Scoring rules: items of a list field match by Quote (40 shared characters, or 80% of the shorter Quote), failing that by name (listed below for checking). 10382017's organic certificate is product-level, as judged in score_sonnet_alone.md: a Reading may list it or not. A tender whose read failed or was not made scores as nothing found.
- Tokens of a failed read are in reader/live_spend.json, not in the table below.

## Per field

| Field | Correct | Wrong | Missed | Invented |
|---|---|---|---|---|
| qualification_requirements_set | 15 | 0 | 0 | 0 |
| similar_contracts | 10 | 1 | 4 | 0 |
| min_turnover | 13 | 0 | 2 | 0 |
| certificates_or_licences | 11 | 2 | 2 | 0 |
| named_specialists | 13 | 1 | 1 | 0 |
| right_to_practice_required | 6 | 2 | 4 | 3 |
| bid_security | 14 | 0 | 1 | 0 |
| exclusion_grounds | 12 | 1 | 2 | 0 |
| **Total** | **94** | **7** | **16** | **3** |

Out of 120 cells.

## Wrong or invented values per field

- qualification_requirements_set: none
- similar_contracts: 10377061 (wrong)
- min_turnover: none
- certificates_or_licences: 10324146 (wrong), 10377061 (wrong)
- named_specialists: 10324146 (wrong)
- right_to_practice_required: 10377061 (invented), 10378522 (wrong), 10383512 (invented), 10384200 (wrong), 10389181 (invented)
- bid_security: none
- exclusion_grounds: 10393450 (wrong)

## Tokens per tender (as the API returned them)

| Tender | Counted input | Input | Output | USD | Model that answered |
|---|---|---|---|---|---|
| 10324146 | 143311 | 145029 | 6190 | 0.0880 | claude-haiku-5-5 |
| 10377061 | 99033 | 100751 | 7183 | 0.0683 | claude-haiku-5-5 |
| 10378522 | 78573 | 80291 | 4817 | 0.0104 | claude-haiku-5-5 |
| 10382017 | 132094 | 133812 | 5510 | 0.0807 | claude-haiku-5-5 |
| 10383512 | 144650 | 146368 | 4511 | 0.0845 | claude-haiku-5-5 |
| 10384200 | 226070 | 227788 | 6455 | 0.1300 | claude-haiku-5-5 |
| 10387051 | 46855 | 48573 | 5306 | 0.0075 | claude-haiku-5-5 |
| 10388453 | 12512 | 14230 | 2989 | 0.0029 | claude-haiku-5-5 |
| 10389181 | 71833 | 73551 | 7395 | 0.0111 | claude-haiku-5-5 |
| 10389970 | 100265 | 101983 | 1762 | 0.0554 | claude-haiku-5-5 |
| 10392051 | 839983 | 841701 | 2429 | 0.4269 | claude-haiku-5-5 |
| 10393450 | 28951 | 30669 | 4701 | 0.0054 | claude-haiku-5-5 |
| 10394052 | 46007 | 47725 | 3604 | 0.0066 | claude-haiku-5-5 |
| 10396017 | 54556 | 56274 | 6693 | 0.0090 | claude-haiku-5-5 |
| 10397525 | 222450 | 224168 | 7254 | 0.1302 | claude-haiku-5-5 |

## Disagreements (26)

#### 10324146 · certificates_or_licences: wrong
Key: 2 item(s). Reading: 2 item(s).
- Key item not in the Reading: Valid IATA certificate (or equivalent) of the specialist(s) who will provide the services: “Tiekėjas turi turėti arba pasitelkti specialistą (-us), turintį (-čius) galiojantį IATA sertifikatą arba lygiavertį dokumentą” (`10370153_4 priedas_Kvalifikacijos reikalavimai.docx.txt`)
- Reading item not in the key: Specialisto galiojantis IATA sertifikatas arba lygiavertis dokumentas: “Pateikiama specialisto (-ų), kuris (-ie) tiesiogiai teiks paslaugas, IATA galiojantis (-ys) sertifikatas (-ai) arba lygiaverčiai dokumentai.” (`10370153_4 priedas_Kvalifikacijos reikalavimai.docx.txt`)

#### 10324146 · named_specialists: wrong
Key: 1 item(s). Reading: 1 item(s).
- Key item not in the Reading: kelionių organizavimo specialistas (1, named in bid; experience scored in evaluation): “Tiekėjas nurodo 1 (vieną) kelionių organizavimo specialistą, kuris tiesiogiai teiks paslaugas Perkančiajai organizacijai (priims, apdoros ir vykdys kelionių užsakymus)” (`10370159_6 priedas_Pasiulymo forma.docx.txt`)
- Reading item not in the key: Kelionių organizavimo specialistas, kurio profesinė patirtis vertinama pagal kokybės kriterijų (1 specialistas) ir kuris tiesiogiai teiks paslaugas: “Tiekėjas turi turėti arba pasitelkti specialistą (-us), turintį (-čius) galiojantį IATA sertifikatą arba lygiavertį dokumentą” (`10370153_4 priedas_Kvalifikacijos reikalavimai.docx.txt`)

#### 10324146 · bid_security: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Pasiūlymo galiojimo užtikrinimas pirkimo dalyviui grąžinamas (arba atsisakoma teisių į jį) per | NETAIKOMA” (`10370150_1 priedas_Terminai.docx.txt`)
- Reading Quote: no quote

#### 10377061 · similar_contracts: wrong
Key: true. Reading: true. Differs: count: key None, reading 1.
- Key Quote: “pagal vieną ar daugiau sutarčių savo jėgomis yra tinkamai atlikęs gatvių, kelių statybos, rekonstravimo ir /ar remonto darbus, kurių vertė yra ne mažesnė kaip 200 000 Eur be PVM.” (`10377247_Pirkimas Nr. 3__4 priedas. Kvalifikacijos reikalavimai.docx.txt`)
- Reading Quote: “pagal vieną ar daugiau sutarčių savo jėgomis yra tinkamai atlikęs gatvių, kelių statybos, rekonstravimo ir /ar remonto darbus, kurių vertė yra ne mažesnė kaip 200 000 Eur be PVM” (`10377247_Pirkimas Nr. 3__4 priedas. Kvalifikacijos reikalavimai.docx.txt`)

#### 10377061 · certificates_or_licences: wrong
Key: 2 item(s). Reading: 1 item(s).
- Key item not in the Reading: Specialists' kvalifikacijos atestatai (SSVA / Architektų rūmai) for exceptional-structure construction manager and design manager, roads and streets: “SSVA (iki 2022-04-30 SPSC) ir/ar Architektų rūmų išduoti kvalifikacijos atestatai” (`10377247_Pirkimas Nr. 3__4 priedas. Kvalifikacijos reikalavimai.docx.txt`)

#### 10377061 · right_to_practice_required: invented
Key: nothing found. Reading: true.
- Key Quote: no quote
- Reading Quote: “Jeigu tiekėjo kvalifikacija dėl teisės verstis atitinkama veikla nebuvo tikrinama arba tikrinama ne visa apimtimi, tiekėjas perkančiajai organizacijai įsipareigoja, kad pirkimo sutartį vykdys tik tokią teisę turintys asmenys.” (`10377247_Pirkimas Nr. 3__4 priedas. Kvalifikacijos reikalavimai.docx.txt`)

#### 10378522 · similar_contracts: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Tiekėjams nenustatomi reikalavimai dėl kvalifikacijos ir kokybės vadybos sistemos standartų laikymosi.” (`10378879_Pirkimo dokumentai___Specialiosios prikimo sąlygos002.docx.txt`)
- Reading Quote: no quote

#### 10378522 · min_turnover: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Tiekėjams nenustatomi reikalavimai dėl kvalifikacijos ir kokybės vadybos sistemos standartų laikymosi.” (`10378879_Pirkimo dokumentai___Specialiosios prikimo sąlygos002.docx.txt`)
- Reading Quote: no quote

#### 10378522 · right_to_practice_required: wrong
Key: false. Reading: true.
- Key Quote: “Tiekėjams nenustatomi reikalavimai dėl kvalifikacijos ir kokybės vadybos sistemos standartų laikymosi.” (`10378879_Pirkimo dokumentai___Specialiosios prikimo sąlygos002.docx.txt`)
- Reading Quote: “Tiekėjas, teikdamas pasiūlymą, įsipareigoja, kad sutartį vykdys tik teisę verstis atitinkama veikla turintys asmenys.” (`10378879_Pirkimo dokumentai___Specialiosios prikimo sąlygos002.docx.txt`)

#### 10383512 · certificates_or_licences: missed
Key: 1 item(s). Reading: 0 item(s).
- Key item not in the Reading: Geodezininko kvalifikacijos pažymėjimas (specialist's, issued by Nacionalinė žemės tarnyba): “dėl b) punkte nurodyto specialisto pateikiamas Nacionalinės žemės tarnybos prie Aplinkos ministerijos išduoto kvalifikacijos pažymėjimo (arba lygiaverčio dokumento) kopijos.” (`10383897_Skelbiamos_apklausos_specialiosios_salygos.docx.txt`)

#### 10383512 · named_specialists: missed
Key: 2 item(s). Reading: 0 item(s).
- Key item not in the Reading: statybos darbų vadovas (statybos inžinierius ar architektas): “a) statybos darbų vadovą (statybos inžinierių ar architektą), turintį statybos inžinerijos arba statybos technologijų studijų krypties (šakos) kvalifikacinį laipsnį” (`10383897_Skelbiamos_apklausos_specialiosios_salygos.docx.txt`)
- Key item not in the Reading: geodezininkas: “b) specialistą, turintį geodezininko kvalifikacijos pažymėjimą.” (`10383897_Skelbiamos_apklausos_specialiosios_salygos.docx.txt`)
- Reading Quote that failed the Quote check, so not scored: “a) statybos darbų vadovą (statybos inžinierių ar architektą), turintį statybos inžinerijos arba statybos technologijų studijų krypties (šakos) kvalifikacinį laipsnį” (`10383862_Skelbiamos_apklausos_specialiosios_salygos (9).pdf.txt`)
- Reading Quote that failed the Quote check, so not scored: “b) specialistą, turintį geodezininko kvalifikacijos pažymėjimą.” (`10383862_Skelbiamos_apklausos_specialiosios_salygos (9).pdf.txt`)

#### 10383512 · right_to_practice_required: invented
Key: nothing found. Reading: true.
- Key Quote: no quote
- Reading Quote: “Tiekėjas, teikdamas pasiūlymą, įsipareigoja, kad sutartį vykdys tik teisę verstis atitinkama veikla turintys asmenys.” (`10383862_Skelbiamos_apklausos_specialiosios_salygos (9).pdf.txt`)

#### 10384200 · right_to_practice_required: wrong
Key: false. Reading: true.
- Key Quote: “4.2. Tiekėjams nenustatomi kvalifikacijos reikalavimai.” (`10388080_Specialiosios sąlygos 11-09.docx.txt`)
- Reading Quote: “Jeigu tiekėjo kvalifikacija dėl teisės verstis atitinkama veikla nebuvo tikrinama arba tikrinama ne visa apimtimi” (`10388072_Bendrosios pirkimo sąlygos_11-09.docx.txt`)

#### 10388453 · right_to_practice_required: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Perkantysis subjektas nenustato kvalifikacinių reikalavimų Tiekėjams.” (`10388560_Salygos.pdf.txt`)
- Reading Quote: no quote

#### 10388453 · exclusion_grounds: missed
Key: none. Reading: nothing found.
- This field carries no Quote in the record; judge it from the documents.

#### 10389181 · right_to_practice_required: invented
Key: nothing found. Reading: true.
- Key Quote: no quote
- Reading Quote: “Tiekėjas privalo turėti bent 1 (vieną) specialistą turinčio teisę eiti ypatingojo” (`10389336_21737-1105.2__Priedas_8_Kvalifikacijos ir kiti reikalavimai tiek_jui Violeta.docx.txt`)

#### 10389970 · similar_contracts: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Minimalūs tiekėjų kvalifikacijos reikalavimai ir tiekėjų pašalinimo pagrindai netaikomi.” (`10390104_pirkimo dok..docx.txt`)
- Reading Quote: no quote

#### 10389970 · right_to_practice_required: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Minimalūs tiekėjų kvalifikacijos reikalavimai ir tiekėjų pašalinimo pagrindai netaikomi.” (`10390104_pirkimo dok..docx.txt`)
- Reading Quote: no quote

#### 10392051 · similar_contracts: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “3.1. Perkančioji organizacija nenustato tiekėjo pašalinimo pagrindų, reikalavimų kvalifikacijai bei nereikalauja, kad tiekėjas laikytųsi kokybės vadybos sistemos ir (arba) aplinkos apsaugos vadybos sistemos standartų (toliau – Reikalavimai tiekėjui).” (`10392183_ISP-38 pirkimo salygos.doc.pdf.txt`)
- Reading Quote: no quote

#### 10392051 · min_turnover: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “3.1. Perkančioji organizacija nenustato tiekėjo pašalinimo pagrindų, reikalavimų kvalifikacijai bei nereikalauja, kad tiekėjas laikytųsi kokybės vadybos sistemos ir (arba) aplinkos apsaugos vadybos sistemos standartų (toliau – Reikalavimai tiekėjui).” (`10392183_ISP-38 pirkimo salygos.doc.pdf.txt`)
- Reading Quote: no quote

#### 10392051 · certificates_or_licences: missed
Key: 1 item(s). Reading: 0 item(s).
- Key item not in the Reading: Proof of renewable electricity use OR environmental management system LST EN ISO 14001 / equivalent (technical specification requirement): “TEIKĖJAS turi patvirtinti dokumentu, kad veikloje naudoja elektros energiją iš atsinaujinančiųjų energijos išteklių arba turi taikyti aplinkos apsaugos vadybos sistemos reikalavimus pagal standartą LST EN ISO 14001” (`10392135_1. priedas Technine specifikacija.doc.txt`)

#### 10392051 · right_to_practice_required: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “3.1. Perkančioji organizacija nenustato tiekėjo pašalinimo pagrindų, reikalavimų kvalifikacijai bei nereikalauja, kad tiekėjas laikytųsi kokybės vadybos sistemos ir (arba) aplinkos apsaugos vadybos sistemos standartų (toliau – Reikalavimai tiekėjui).” (`10392183_ISP-38 pirkimo salygos.doc.pdf.txt`)
- Reading Quote: no quote

#### 10392051 · exclusion_grounds: missed
Key: none. Reading: nothing found.
- This field carries no Quote in the record; judge it from the documents.

#### 10393450 · right_to_practice_required: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “3.1. Perkančioji organizacija netaiko kvalifikacijos reikalavimų.” (`10393866_Skelbiamos apklausos pirkimo sąlygos.docx.txt`)
- Reading Quote: no quote

#### 10393450 · exclusion_grounds: wrong
Key: declaration. Reading: espd.
- This field carries no Quote in the record; judge it from the documents.

#### 10397525 · similar_contracts: missed (soft)
Key: false. Reading: nothing found.
- Key Quote: “Techninio ir profesinio pajėgumo reikalavimai | Techninio ir profesinio pajėgumo reikalavimai | Techninio ir profesinio pajėgumo reikalavimai 1. | Netaikoma | Netaikoma” (`10397674_Pirkimo dokumentai.docx.txt`)
- Reading Quote: no quote

## Reading quotes that failed the Quote check (scored as not found)

- 10383512 · named_specialists[0]: “a) statybos darbų vadovą (statybos inžinierių ar architektą), turintį statybos inžinerijos arba statybos technologijų studijų krypties (šakos) kvalifikacinį laipsnį” (`10383862_Skelbiamos_apklausos_specialiosios_salygos (9).pdf.txt`)
- 10383512 · named_specialists[1]: “b) specialistą, turintį geodezininko kvalifikacijos pažymėjimą.” (`10383862_Skelbiamos_apklausos_specialiosios_salygos (9).pdf.txt`)
- 10383512 · other_requirements[0]: “vadovaujančių specialistų ir asmenų, atsakingų už sutarties vykdymą, sąrašas, pateiktas elektroninėje formoje” (`10383862_Skelbiamos_apklausos_specialiosios_salygos (9).pdf.txt`)

