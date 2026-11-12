# Scoring: "cascade" reader vs answer key (15 tenders)

The scored files are `cascade/extract/<id>.json`, checked against `qualify/key/<id>.json`. The extra `passage` and `*_evidence` fields were ignored. The rubric is the one in `qualify/score_sonnet_alone.md`:
- CORRECT means the value matches the truth.
- WRONG means a different non-null value, or a partial set.
- MISSED means null, "unclear" or empty where the truth has a value. This includes an explicit "not required" left as null, which is scored as a soft miss, as before.
- INVENTED means a value or item where the truth has none.
- Certificates are a supplier-level set that includes personnel certificates, because the key and the earlier scoring list SSVA, geodesist, matininkas and IATA-specialist certificates there. Product-level items and boilerplate are errors.

Cause classes:
- (a) the passage was not in `selected2/<id>.txt` (a screening miss)
- (b) the passage was selected, but the extractor misread or omitted it
- (c) the documents are ambiguous or contradict themselves
- (d) a key issue

Machine-readable results are in `cascade/score_cascade.json`.

## 1. Totals

| Field | Correct | Wrong | Missed | Invented |
|---|---|---|---|---|
| 1 qualification_requirements_set | 13 | 1 | 1 | 0 |
| 2 similar_contracts | 12 | 0 | 3 | 0 |
| 3 min_turnover | 11 | 0 | 4 | 0 |
| 4 certificates_or_licences | 7 | 5 | 1 | 2 |
| 5 named_specialists | 13 | 0 | 0 | 2 |
| 6 right_to_practice_required | 9 | 3 | 2 | 1 |
| 7 bid_security | 14 | 0 | 1 | 0 |
| 8 exclusion_grounds | 12 | 2 | 1 | 0 |
| **Cascade total** | **91** | **11** | **13** | **5** |
| Sonnet alone (earlier) | 105 | 1 | 14 | 0 |

- **Causes of the 29 non-correct cells:** a = 2, b = 22, c = 5, d = 0.
- **Soft cells:** 10 of the 29 have no practical effect for a bidder. In 9 of them an explicit "not required" was left as null. In 1 (10383512) the reader gave false where the key's convention is null.
- **Substantive errors** after removing the soft cells: cascade 19, Sonnet alone about 10. Sonnet's 14 misses include 4 soft right-to-practise nulls plus the 10388453 "none from silence" case.
- **Tenders with all 8 fields correct:** 3 (10382017, 10394052, 10397525). Sonnet alone had 7.
- **Lenient view (not the rubric):** if personnel certificates kept inside `named_specialists` were accepted, and generic contract "has all licences" warranties were ignored, the cascade would score 15/15 on certificates. That would move 8 cells and give 99 correct. Under the same leniency Sonnet alone would gain only 10324146 (106).

## 2. Did the cascade fix Sonnet alone's substantive misses?

| Sonnet-alone miss | Cascade |
|---|---|
| 10382017 similar contract (>= 38 200 / 23 800 EUR, 3 yrs) | **Got it.** Passage 2:21; count 1, value 38 200, 3 yrs, lot II in the description. |
| 10382017 VMVT food-business approval (+ right to practise true) | **Got it**, both fields. The product-level organic certificate was correctly left out. |
| 10392051 ISO 14001 / renewable electricity (tech spec p.22) | **Got it** as an alternative. The cell is still scored WRONG because a generic contract 15.5 "all licences" warranty was added. |
| 10397525 "Netaikoma" qualification table | **Got it.** qualification "no", similar_contracts false (passage 0:58). |
| 10324146 specialist IATA certificate | **Same miss.** It is recorded under named_specialists, not certificates, which is the same filing as Sonnet. A boilerplate licence item was also added. |
| 10378522 exclusion declaration | **Got it.** |
| 10393450 exclusion declaration | **Not got, and worse.** The reader said "espd" where Sonnet said "unclear". Cause a: the offer form was not selected. |

## 3. Per-tender notes (non-correct cells only)

**10324146** (travel services; 6/8)
- *Certificates* WRONG (b). The IATA membership was found. The specialist IATA certificate (Annex 4 p.2.2) was selected and quoted, but placed only in `named_specialists`. The tech spec's "turės visus ... leidimus, licencijas" contract warranty was added as a certificate.
- *Bid security* MISSED (a). The "NETAIKOMA" rows are in `1 priedas_Terminai.docx` (l.11-12), and no passage from that file was selected.

**10377061** (street works; 7/8)
- *Certificates* WRONG (b). ISO 14001/EMAS is correct. The SSVA/Architektų rūmai attestations (passage 2:1) appear only in the specialists' qualification text.

**10378522** (sports ground; 7/8)
- *Min turnover* MISSED (b, soft). The reader used "Tiekėjams nenustatomi reikalavimai dėl kvalifikacijos ..." to set similar_contracts to false, but left turnover null.
- *Right to practise* is false, matching the key's value. The reader quoted the fallback commitment rather than the "nenustatomi" statement. Scored CORRECT.

**10382017** (chocolate): all correct.

**10383512** (footpath; 6/8)
- *Certificates* WRONG (b). The geodesist NŽT certificate was found inside named_specialists. Certificates holds only contract 12.6 "visus būtinus leidimus, kvalifikacijos pažymėjimus".
- *Right to practise* WRONG (b, soft). The reader gave false. The source is conditional: "Jeigu tiekėjo kvalifikacija dėl teisės verstis atitinkama veikla nėra tikrinama visa apimtimi, tiekėjas ... įsipareigoja" (special conditions l.212). The key uses null for a fallback commitment only, and that holds. There is no practical difference.

**10384200** (construction, EMS only; 3/8)
- *Qualification set* WRONG (c). The reader said "yes" on the strength of the ISO 14001/EMAS row. The truth is "no": "4.2. Tiekėjams nenustatomi kvalifikacijos reikalavimai." and Priedas 4 item 1 "Reikalavimai tiekėjo kvalifikacijai nenustatomi." An EMS standard is a separate category. The reader flagged the contradiction.
- *Similar contracts* and *turnover* MISSED (b, soft). Both are null although 4.2 was selected.
- *Named specialists* INVENTED (b). The source is contract text: "atestuotą Statybos darbų vadovą (jeigu tai privaloma pagal teisės aktus)".
- *Right to practise* MISSED (b, soft). The reader gave null with a contract-clause quote.

**10387051** (cadastral survey; 7/8)
- *Certificates* MISSED (b). The matininkas certificate was recorded only under named_specialists.

**10388453** (water meters; 6/8)
- *Right to practise* MISSED (b, soft). The reader gave null, although the 3.1 "nenustato kvalifikacinių reikalavimų" quote was used for turnover and similar contracts.
- *Exclusion* MISSED (c). The reader said "unclear" where the key says "none". The documents are silent, and Sonnet alone was scored the same way.

**10389181** (castle lighting; 6/8)
- *Certificates* WRONG (b). The SSVA attestation with the heritage endorsement (passage 5:10) was not listed. The reader listed "jeigu taikytina, laikytis kokybės vadybos ... standartų" boilerplate instead.
- *Right to practise* INVENTED (b). It was set to true from the conditional fallback in 3.3: "jei tokia teisė reikalaujama pagal teisės aktus ir nebuvo patikrinta".

**10389970** (services; 3/8)
- *Similar contracts* and *turnover* MISSED (b, soft). Both are null despite "3.1. Minimalūs tiekėjų kvalifikacijos reikalavimai ir tiekėjų pašalinimo pagrindai netaikomi."
- *Certificates* INVENTED (b). Contract 16.2's "has all licences" warranty.
- *Right to practise* WRONG (b). The reader gave true from a contract clause, against the explicit 3.1.
- *Exclusion* WRONG (c). The reader said "none". 3.1 says "pašalinimo pagrindai netaikomi", but 5.7.5 requires "TIEKĖJŲ DEKLARACIJOS", and the VPĮ 46(2¹) declaration form is attached. Everything was selected. The key's "declaration" stands (verified earlier).

**10392051** (generator maintenance; 3/8)
- *Qualification set* MISSED (c). The reader said "unclear" because of the tech-spec/3.1 conflict.
- *Similar contracts* and *turnover* MISSED (b, soft). Both are null despite 3.1.
- *Certificates* WRONG (b). The ISO 14001 / renewable alternative is correct, but the contract 15.5 "visas ... licencijas" warranty was added.
- *Right to practise* WRONG (c). The reader gave true from tech spec p.8: "...būtina turėti energetikos įrenginių eksploatavimo veiklos atestatą ... būtų atliekami tokią teisę turinčių ūkio subjektų ir specialistų. PIRKĖJUI pareikalavus, TEIKĖJAS pateikia ...". This is a performance obligation that can be met through others, with proof only on the buyer's request. Conditions 3.1 set no qualification. The key (false) is kept, but this is a soft spot like the ISO item.

**10393450** (works; 6/8)
- *Named specialists* INVENTED (b). Contract 5.1: "paskirti reikiamą kvalifikaciją turintį darbų vadovą".
- *Exclusion* WRONG (a). The reader said "espd". The offer form's "Patvirtiname, kad tiekėjui nėra taikomas VPĮ 46 straipsnio 2¹ dalyje nustatytas pašalinimo pagrindas." was not selected. The extractor inferred ESPD from 10.2 "(pagal tiekėjų pateiktus EBVPD) jeigu taikytina".

**10394052** (insurance): all correct.

**10396017** (disc harrow; 7/8)
- *Certificates* INVENTED (b). Contract 15.5 "Pardavėjas garantuoja, kad turi visas ... licencijas".

**10397525** (vehicles): all correct, including the "Netaikoma" table that Sonnet alone missed.

## 4. Error patterns

1. **Contract boilerplate promoted to requirements (b).** This accounts for 9 cells. Generic "has all licences" warranties were listed as certificates in 5 tenders, plus 10389181's conditional QMS clause. Site-manager clauses became named specialists in 2 tenders. Contract or fallback clauses became right-to-practise true in 10389181, 10389970 and 10392051. Sonnet alone invented nothing. The small extractor does not tell qualification conditions apart from contract obligations.
2. **Personnel certificates not cross-filed as certificates (b, filing convention).** This happened in 5 tenders. The information is present in named_specialists.
3. **Explicit "not required" left null (b, soft).** There are 9 such cells, even where the same quote was used for a sibling field.
4. **Screening misses (a) are rare: 2.** They are 10324146 Annex 1 (Terminai) and the 10393450 offer form. Screening fixed every one of Sonnet alone's coverage misses (10382017, 10397525, 10392051 tech spec, 10378522).
5. **Contradictions (c): 5.** The reader flagged each one in its notes and resolved 4 of them away from the key.

## 5. Key check

No key corrections. Every disagreement was checked against `cascade/text/<id>/`. Soft spots, unchanged from the earlier scoring:
- 10392051: right to practise. Tech spec p.8 has an attestat obligation, but 3.1 says no qualification.
- 10388453: exclusion "none" comes from silence.
- 10383512 vs 10396017: right to practise null/false depends on whether the fallback commitment is conditional ("jeigu ... nėra tikrinama") or unconditional ("nėra tikrinama").

## 6. Quote verification

All 103 reader quotes were checked against the cited passage in `selected2/<id>.txt` and against the source text. All 103 were found in the cited passage: 100 byte-exact and 3 after whitespace normalisation. All 103 are also in `cascade/text/<id>/`.

Random sample of 20 (seed 7), all OK:

| # | Tender | Field | Passage | Result | Quote (start) |
|---|---|---|---|---|---|
| 1 | 10387051 | named_specialists[0] | 2:3 | exact | Tiekėjas privalo pasiūlyti bent 1 (vieną) specialistą, turintį galiojantį matininko ... |
| 2 | 10382017 | certificates[0] | 2:21 | exact | Tiekėjas turi pateikti teritorinių valstybinių maisto ir veterinarijos tarnybų ... |
| 3 | 10389181 | certificates[0] | 2:2 | exact | ir, jeigu taikytina, laikytis kokybės vadybos sistemos ... |
| 4 | 10393450 | exclusion_grounds_evidence | 0:7 | exact | Perkančioji organizacija pirmiausia patikrina, ar nėra ... pašalinimo pagrindų |
| 5 | 10377061 | similar_contracts | 2:0 | exact | pagal vieną ar daugiau sutarčių savo jėgomis yra tinkamai atlikęs gatvių ... |
| 6 | 10377061 | named_specialists[1] | 2:1 | exact | ne mažiau kaip vieną ypatingojo statinio projekto vadovą ... |
| 7 | 10389970 | other_requirements[3] | 1:48 | exact | Aplinkos apsaugos kriterijai Paslaugoms nustatomi ... |
| 8 | 10377061 | other_requirements[1] | 4:11 | exact | Jeigu draudimo sutartis buvo nutraukta ar pasibaigė ankščiau ... |
| 9 | 10388453 | other_requirements[0] | 0:7 | ws-norm | Skaitikliai su nuotolinio duomenų perdavimo WM-BUS moduliu ... |
| 10 | 10392051 | other_requirements[1] | 0:3 | exact | TEIKĖJAS generatorių remonto darbams turi suteikti ... |
| 11 | 10377061 | certificates[0] | 2:3 | exact | Tiekėjas teikiamoms projektavimo paslaugoms ... LST EN ISO 14001 |
| 12 | 10389970 | bid_security | 0:8 | exact | Perkančioji organizacija nereikalauja pasiūlymo galiojimo užtikrinimo |
| 13 | 10383512 | named_specialists[1] | 2:17 | exact | b) specialistą, turintį geodezininko kvalifikacijos pažymėjimą. |
| 14 | 10324146 | right_to_practice | 3:1 | exact | Tiekėjas turi teisę verstis veikla, kuri reikalinga pirkimo sutarčiai įvykdyti ... |
| 15 | 10377061 | other_requirements[0] | 4:10 | exact | Rangovas privalo užtikrinti nepertraukiamą Sutarties įvykdymo užtikrinimo galiojimą ... |
| 16 | 10389181 | other_requirements[1] | 0:9 | exact | Rangovas per 10 (dešimt) darbo dienų nuo Pirkimo sutarties pasirašymo ... |
| 17 | 10389181 | bid_security | 2:9 | exact | Pasiūlymo galiojimo užtikrinimas nereikalaujamas. |
| 18 | 10377061 | named_specialists[0] | 2:1 | exact | ne mažiau kaip vieną ypatingojo statinio statybos vadovą ... |
| 19 | 10383512 | exclusion_grounds_evidence | 2:3 | exact | Tiekėjas teikdamas pasiūlymą turi pateikti tiekėjo deklaraciją ... |
| 20 | 10392051 | certificates[1] | 2:20 | exact | Teikėjas garantuoja, kad turi visas Sutarties įvykdymui reikalingas licencijas. |

The quotes are faithful. The errors come from what was quoted (contract boilerplate) and how it was classified, not from fabrication.
