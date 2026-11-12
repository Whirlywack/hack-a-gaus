# Scoring: "Sonnet alone" reader vs answer key (15 tenders)

Scored files: `qualify/sonnet_alone/<id>.json` against `qualify/key/<id>.json`. Every substantive disagreement was adjudicated against `route3/text/<id>/`.

## 1. Adjudication of disagreements (key vs reader)

| Tender | Point | Key | Reader | Source check | Verdict |
|---|---|---|---|---|---|
| 10382017 | qualification set, similar contracts, VMVT cert, right to practise | yes; 1 contract >= 38 200 EUR excl. VAT (lot I) / 23 800 (lot II), 3 yrs; VMVT food-business approval; rtp true | unclear; null; only the organic product certificate; rtp null | SPECIALIOSIOS SALYGOS.docx.txt l.618-622: "turi būti įvykdęs bent vieną šokolado ar kitų panašių konditerijos gaminių gamybos ir (ar) tiekimo sutartį, kurios vertė būtų ne mažesnė kaip 38 200,00 Eur be PVM." and "Tiekėjas turi pateikti teritorinių valstybinių maisto ir veterinarijos tarnybų išduotą Maisto tvarkymo subjekto patvirtinimo pažymėjimą". The Annex 4 heading is at l.210 but the docx table was extracted to the end of the file (l.618+). | Key right |
| 10397525 | qualification set / similar contracts | no; required false | unclear; null | Pirkimo dokumentai.docx.txt l.1370-1371: "Techninio ir profesinio pajėgumo reikalavimai ... 1. \| Netaikoma \| Netaikoma"; QMS/EMS row l.1374 "Netaikoma". Reader's read ranges (72-130, 270-274, 531-545, 1120-1125, 1488-1494) skip it. | Key right |
| 10392051 | certificates | renewable-electricity proof OR ISO 14001 (tech spec p.22) | none | 1. priedas Technine specifikacija.doc.txt l.47: "TEIKĖJAS turi patvirtinti dokumentu, kad veikloje naudoja elektros energiją iš atsinaujinančiųjų energijos išteklių arba turi taikyti aplinkos apsaugos vadybos sistemos reikalavimus pagal standartą LST EN ISO 14001" (repeated in the offer form and the contract). Reader did not open the tech spec. | Key right (an either/or requirement that contradicts conditions 3.1) |
| 10324146 | certificates | IATA membership + specialist IATA certificate | IATA membership only | 4 priedas l.32: "2.2. \| Tiekėjas turi turėti arba pasitelkti specialistą (-us), turintį (-čius) galiojantį IATA sertifikatą arba lygiavertį dokumentą". The reader saw it but filed it under other_requirements as an evaluation criterion. | Key right |
| 10378522 | exclusion grounds | declaration | unclear | Specialiosios sąlygos l.182: "Šio pašalinio pagrindo nebuvimą Tiekėjas patvirtina pateikdamas užpildytą ir pasirašytą Pasiūlymo formą" | Key right |
| 10393450 | exclusion grounds | declaration | unclear | 1 priedas Pasiūlymo forma l.24: "Patvirtiname, kad tiekėjui nėra taikomas VPĮ 46 straipsnio 2¹ dalyje nustatytas pašalinimo pagrindas." | Key right |
| 10388453 | exclusion grounds | none | unclear | Searched all texts: no pašalin*/EBVPD/declaration request at all. | Key acceptable ("none" taken from silence; the key's own notes say so). Scored as MISSED but low impact. |
| 10378522, 10384200, 10392051, 10393450 | right to practise | false (explicit "no qualification requirements" statements) | null | e.g. 10384200: "4.2. Tiekėjams nenustatomi kvalifikacijos reikalavimai."; 10393450: "3.1. Perkančioji organizacija netaiko kvalifikacijos reikalavimų." | Key right (soft: no practical difference for a bidder) |

**Key corrections: none.** All 9 disputed points were checked against the source, and the key held on each one. Soft spots in the key (not errors):
- 10388453: exclusion "none" comes from silence, not from an explicit statement.
- 10392051: the ISO 14001 item is an alternative to proof of renewable electricity. It sits in the tech spec, while conditions 3.1 say no standards apply.
- The key's right_to_practice convention is uneven. It uses false where the documents say no qualification applies (or, in 10396017, "nėra tikrinama"). It uses null where only the VPĮ fallback commitment appears.

## 2. Per-field scores (15 tenders, 120 cells)

| Field | Correct | Wrong | Missed | Invented | Errors |
|---|---|---|---|---|---|
| 1 qualification_requirements_set | 13 | 0 | 2 | 0 | 10382017 (unclear, truth yes), 10397525 (unclear, truth no) |
| 2 similar_contracts | 13 | 0 | 2 | 0 | 10382017 (requirement missed), 10397525 (explicit "Netaikoma" read as null) |
| 3 min_turnover | 15 | 0 | 0 | 0 | none (no tender has one) |
| 4 certificates_or_licences | 12 | 1 | 2 | 0 | 10324146 partial (WRONG), 10382017 VMVT missed, 10392051 ISO 14001 alternative missed |
| 5 named_specialists | 15 | 0 | 0 | 0 | none |
| 6 right_to_practice_required | 10 | 0 | 5 | 0 | 10382017 (true, missed: substantive); 10378522, 10384200, 10392051, 10393450 (explicit false, left null: soft) |
| 7 bid_security | 15 | 0 | 0 | 0 | none (no tender requires it) |
| 8 exclusion_grounds | 12 | 0 | 3 | 0 | 10378522, 10393450 (declaration), 10388453 (none) |
| **Total** | **105** | **1** | **14** | **0** | |

Per tender, all 8 fields correct in: 10377061, 10383512, 10387051, 10389181, 10389970, 10394052, 10396017 (7 of 15).

Product-level vs supplier-level: the reader made no confusions. It correctly tagged the 10382017 organic certificate as a product requirement, and it kept the 10388453 RoHS/RED/compatibility declarations out of the certificates. Its error was the reverse kind: it caught the product certificate but missed the supplier-level VMVT approval next to it.

The reader invented nothing. Every miss is an omission or an "unclear", which makes it conservative but leaky.

## 3. Quote verification

All 70 reader quotes were checked (whitespace-normalised substring of the cited file). 70/70 were found, 63 exact and 7 differing only in line breaks or double spaces. Random sample of 10 (seed 7), all verbatim:

1. 10389181 rtp, Pirkimo_salygos.docx: "tiekėjas perkančiajai organizacijai  įsipareigoja, kad pirkimo sutartį  vykdys tik tokią  teisę  turintys asmenys." (OK)
2. 10382017 certificate, SPECIALIOSIOS SALYGOS: "galiojantys ekologinės gamybos sertifikatas išduotas siūlomam produktui, ..." (OK)
3. 10389970 other, Tiekėjo deklaracija: "TIEKĖJO DEKLARACIJA DĖL TARYBOS REGLAMENTE (ES) 2022/576 NUSTATYTŲ SĄLYGŲ NEBUVIMO" (OK after whitespace normalisation)
4. 10324146 other, 4 priedas: "Tiekėjas kartu su pasiūlymu privalo pateikti šio specialisto galiojantį IATA sertifikatą arba lygiavertį dokumentą" (OK)
5. 10377061 certificate, 4 priedas: "Tiekėjas teikiamoms projektavimo paslaugoms bei atliekamiems statybos darbams taiko aplinkos apsaugos vadybos sistemos reikalavimus pagal standartą LST EN ISO 1..." (OK)
6. 10377061 rtp, 4 priedas: "tiekėjas perkančiajai organizacijai įsipareigoja, kad pirkimo sutartį vykdys tik tokią teisę turintys asmenys." (OK)
7. 10389970 min_turnover, pirkimo dok.: "Minimalūs tiekėjų kvalifikacijos reikalavimai ir tiekėjų pašalinimo pagrindai netaikomi." (OK)
8. 10388453 rtp, Salygos.pdf: "Perkantysis subjektas nenustato kvalifikacinių reikalavimų Tiekėjams." (OK)
9. 10324146 rtp, 4 priedas: "Tiekėjas turi teisę verstis veikla, kuri reikalinga pirkimo sutarčiai įvykdyti: kelionių organizavimu/ ..." (OK)
10. 10393450 bid security, pirkimo sąlygos: "Perkančioji organizacija nereikalauja Pasiūlymo galiojimo užtikrinimo." (OK)

The reader's problem is coverage, not fabrication.

## 4. The 5 most damaging reader errors

1. **10382017: similar-contract requirement missed.** Truth: "turi būti įvykdęs bent vieną šokolado ar kitų panašių konditerijos gaminių gamybos ir (ar) tiekimo sutartį, kurios vertė būtų ne mažesnė kaip 38 200,00 Eur be PVM" (lot II 23 800). Reader: required null, qualification "unclear", and a note that Annex 4 has "only general rules". Cause: the docx-to-text conversion puts the table body roughly 400 lines after the Annex 4 heading (l.210 vs l.618), and the reader read the heading section only.
2. **10382017: supplier licence and right to practise missed (same root cause).** Truth: "Tiekėjas turi turėti teisę verstis veikla ... Maisto tvarkymo subjekto patvirtinimo pažymėjimą ... 10.82 ... / 46.36". Reader recorded only the lot-II product organic certificate. A food wholesaler without VMVT approval would get no warning.
3. **10392051: ISO 14001 / renewable-electricity proof missed.** Truth (tech spec p.22): "TEIKĖJAS turi patvirtinti dokumentu, kad veikloje naudoja elektros energiją iš atsinaujinančiųjų energijos išteklių arba ... LST EN ISO 14001". Reader: no certificates. Cause: it read only the conditions (3.1 says no standards) and grepped the contract. It never opened the tech spec or the offer form, where the requirement is repeated.
4. **10397525: "Netaikoma" qualification table not found.** Truth: "Techninio ir profesinio pajėgumo reikalavimai ... 1. | Netaikoma | Netaikoma". Reader: qualification "unclear", similar contracts null. Cause: a 250k-character single bundle read in hand-picked line ranges; the table is at l.1370, outside them. This is less harmful because the truth is "nothing required", but the record cannot tell the user so.
5. **10324146: specialist IATA certificate (Annex 4 p.2.2) dropped from certificates.** Truth: "Tiekėjas turi turėti arba pasitelkti specialistą (-us), turintį (-čius) galiojantį IATA sertifikatą arba lygiavertį dokumentą". Reader filed it as an evaluation-criterion document. Cause: it conflated a qualification requirement with the evaluation annex that refers back to it.

Runner-up: 10378522 and 10393450 exclusion "unclear". The declaration sits in the offer form or in the exclusion table at the end of the file, and the reader looked only at the bid-contents list.

Common pattern: the requirement is present in a file the reader listed, but in a table moved to the end of the converted docx, or in an annex/tech spec it never opened. The reader's own notes flag partial reads in 9 of 15 records ("grep", "only parts", "not read").

## 5. Requirement types in the truth (key, no corrections needed)

| Type | Tenders | Detail |
|---|---|---|
| No qualification requirements at all | **8 / 15** | 10378522, 10384200, 10388453, 10389970, 10392051, 10393450, 10396017, 10397525. Two of them still ask for an EMS standard: 10384200 ISO 14001/EMAS; 10392051 ISO 14001 or renewable-electricity proof, in the tech spec. |
| Qualification set | 7 / 15 | 10324146, 10377061, 10382017, 10383512, 10387051, 10389181, 10394052 |
| Similar past contracts | **3** | 10324146: travel/business-trip services, >= 120 000 EUR excl. VAT in total over one or more contracts, last 3 yrs. 10377061: street/road construction or repair "savo jėgomis", >= 200 000 EUR excl. VAT in total, last 5 yrs. 10382017: >= 1 chocolate/confectionery supply contract >= 38 200 (lot I) / 23 800 (lot II) EUR excl. VAT, last 3 yrs. |
| Minimum turnover | **0** | none (no "apyvarta" anywhere in the 15 text sets) |
| Certificates/licences, supplier-level | 6 tenders | IATA membership (10324146); ISO 14001/EMAS (10377061, 10384200, 10392051 alt.); VMVT food-business approval (10382017); Bank of Lithuania insurance licence (10394052) |
| Certificates, personnel-level | 5 tenders | specialist IATA certificate (10324146); SSVA/Architektų rūmai attestations (10377061, 10389181); geodesist certificate from NŽT (10383512); surveyor (matininko) certificate (10387051) |
| Certificates, product-level | 1 | organic production certificate, lot II (10382017) |
| Named specialists | **5** | travel organisation specialist (10324146); exceptional-structure construction manager + design manager (10377061); construction works manager + geodesist (10383512); matininkas (10387051); special construction works manager, electrical, heritage (10389181) |
| Company right to practise required | 3 | 10324146 (travel agency activity), 10382017 (VMVT), 10394052 (insurance) |
| Bid security | **0** | 12 explicitly not required, 3 silent (10387051, 10388453, 10396017) |
| Exclusion grounds | | ESPD 6 (10324146, 10377061, 10382017, 10384200, 10389181, 10397525); declaration 6 (10378522, 10383512, 10387051, 10389970, 10393450, 10396017); none 3 (10388453, 10392051, 10394052) |

### Checkable from public award/contract data vs firm-declared only

| Requirement | Checkable from award/contract data (past contracts with value, CPV, date, buyer)? |
|---|---|
| Similar past contracts | **Partly yes.** Value thresholds, time window and subject (via CPV and title) can be matched against CVP IS award and contract records for public-sector work. The cumulative-sum form (10324146, 10377061) suits this well. Not visible in the data: private-client contracts, "performed with own resources" vs subcontracted share, completed vs merely signed, consortium splits. So data can confirm that a firm qualifies, but cannot rule it out. |
| Minimum turnover | Not in award data (it would come from Registrų centras financial statements, a different public source). Does not occur here anyway. |
| ISO 14001 / EMAS | Firm-declared (certificate copy). Not in award data. |
| Licences (VMVT approval, BoL insurance licence, IATA membership) | Firm-declared in the procedure. Public registers exist, but they are not award/contract data. |
| Named specialists and their attestations / geodesist / surveyor certificates | Firm-declared only (staff list, employment or consent letters). Person-level registers such as SSVA's cannot be linked to a firm without its own declaration. |
| Right to practise | Firm-declared / registry; not award data. |
| Bid security | A property of the tender, not the firm; no check needed (and none required here). |
| Exclusion grounds | Firm-declared (ESPD/declaration); a few public lists (tax debts, KT disqualification) cover parts of it. |

Net result for a firm-side checker: of the 7 tenders with qualification requirements, only 3 contain anything award data can speak to (similar contracts), and all 3 also need something the firm must declare: IATA membership/specialist (10324146), ISO 14001 + attested managers (10377061), VMVT approval (10382017). The other 4 hinge entirely on specialists or licences the firm must declare (10383512, 10387051, 10389181, 10394052).
