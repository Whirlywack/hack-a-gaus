# Outcome of the scoring run (#13)

**Status: pending operator judgement.** The counts are mechanical. The operator judges every disagreement in the run reports, decides whether the bar is met (no invented finding, at least 105 of 120 correct), and may clear a wrong or invented value below as a key issue or a soft cell.

## Runs

| Run | Model | Correct | Wrong | Missed | Invented |
|---|---|---|---|---|---|
| sonnet-1 | claude-sonnet-5-5 | 107 | 1 | 9 | 3 |
| sonnet-2 | claude-sonnet-5-5 | 112 | 6 | 1 | 1 |
| haiku-1 | claude-haiku-5-5 | 94 | 7 | 16 | 3 |

## Fields with a wrong or invented value on the reader's model (claude-sonnet-5-5)

This decides which fields #16 may show if the bar is missed: a field is shown only if it had no wrong and no invented value on the 15 keys.

| Field | Wrong or invented value |
|---|---|
| qualification_requirements_set | no |
| similar_contracts | no |
| min_turnover | no |
| certificates_or_licences | yes: 10377061 (sonnet-1), 10393450 (sonnet-1), 10324146 (sonnet-2), 10377061 (sonnet-2) |
| named_specialists | yes: 10324146 (sonnet-2) |
| right_to_practice_required | yes: 10383512 (sonnet-1), 10389181 (sonnet-1), 10378522 (sonnet-2), 10383512 (sonnet-2), 10392051 (sonnet-2), 10393450 (sonnet-2) |
| bid_security | no |
| exclusion_grounds | no |

## Comparison runs (do not decide which fields are shown)

- haiku-1 (claude-haiku-5-5): similar_contracts: 10377061; certificates_or_licences: 10324146, 10377061; named_specialists: 10324146; right_to_practice_required: 10377061, 10378522, 10383512, 10384200, 10389181; exclusion_grounds: 10393450

## Notes for the operator (written by hand after the runs)

**Which reader each run used.** sonnet-1 ran the reader at d0c5b7b. Review-4 was merged into `main` (825b917) while it ran. That merge changed the prompt: it now states the Quote check's rules and asks for "" for an empty quote. It also joins all text blocks and makes the ledger sum every billed attempt. sonnet-2 and haiku-1 ran the reader as merged. The second Sonnet run scores the reader as it now stands. Because the two runs differ only in that change, they also show how stable the scores are.

**Where to judge.** Every disagreement is listed with its Quote and file in `sonnet-1.md`, `sonnet-2.md` and `haiku-1.md`. Items matched by name only are listed there too; they were counted as matching, so check them. The disagreements fall into these groups:

- **Invented.** sonnet-1 has 3:
  - 10393450 certificates: a "no management standards required" sentence was filed as a certificate.
  - 10383512 right to practise: the bidder's promise that only entitled persons will perform the contract was read as the firm's right to practise. The key has null.
  - 10389181 right to practise: a specialist's right to hold a post was read as the firm's right to practise.

  sonnet-2 has 1: 10383512 right to practise, the same reading as in sonnet-1.
- **Right to practise, wrong in sonnet-2 (3).** 10378522 and 10393450 took the bidder's promise, or the conditional fallback ("jeigu ... nebuvo tikrinama"), as "required". The key has false from "no qualification requirements". In 10392051 the reader used a tech-spec clause that applies "on the buyer's request". score_cascade.md calls that tech-spec clause a soft spot of the key.
- **Personnel certificates.** These certificates were kept inside named_specialists' qualification instead of under certificates:
  - sonnet-1: 10377061, 10383512, 10387051 and 10389181
  - sonnet-2: 10377061 and 10389181

  This is the filing convention that score_cascade.md discusses in its "lenient view".
- **10324146 in sonnet-2.** The specialist's IATA certificate (Annex 4 p. 2.2) became a second named specialist instead of a certificate. That leaves certificates as a partial set, and named_specialists has one item more than the key.
- **The Quote check at work.** In sonnet-1 it turned two findings into "not found":
  - 10378522 right to practise "true", whose quote was not word for word ("turinčius" for "turintys"). This stopped an invented value.
  - 10397525 similar contracts "false", quoted as "Netaikoma", which is under 20 characters.

  The merged prompt states the rules, and in sonnet-2 every quote in the scored fields passed.
- **The one key Quote that is not found** (10384200 other_requirements[8]) is outside the eight scored fields, so no score depends on it.

**Cost.** Each run reads 2.27 million input tokens, not the 1.3 million the spec estimated from character counts. That makes a Sonnet run 4.95 USD, not about 3 USD. sonnet-1 cost 4.95 USD, sonnet-2 4.96 USD and haiku-1 1.12 USD. The ledger (`reader/live_spend.json`) stands at 11.05 USD.
