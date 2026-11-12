"""Seam 2: a tender's converted text in, a checked Reading out.

The model's answer is a fixture (INVENTED_model_answer.json). No live calls here.
"""
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from reading import check_record, load_texts  # noqa: E402

FIXTURES = os.path.join(HERE, "fixtures")
INVENTED = os.path.join(FIXTURES, "INVENTED_tender_99999999")
REAL_TEXT = os.environ.get(
    "GAUS_TENDER_TEXT_DIR",
    os.path.join(os.path.dirname(HERE), "..", "handoff-from-claude", "readings", "text"),
)
KEYS = os.path.join(os.path.dirname(HERE), "..", "handoff-from-claude", "readings", "key")


def answer():
    with open(os.path.join(FIXTURES, "INVENTED_model_answer.json"), encoding="utf-8") as f:
        return json.load(f)


class QuoteCheckOnInventedTender(unittest.TestCase):
    def setUp(self):
        self.texts = load_texts(INVENTED)
        self.states = check_record(answer(), self.texts)["states"]

    def test_quote_split_across_lines_is_found_after_whitespace_normalising(self):
        self.assertEqual(self.states["min_turnover"], "required")

    def test_quote_not_in_the_text_becomes_not_found(self):
        self.assertEqual(self.states["similar_contracts"], "not_found")

    def test_required_false_with_found_quote_is_not_required(self):
        self.assertEqual(self.states["bid_security"], "not_required")

    def test_null_required_is_not_found(self):
        self.assertEqual(self.states["right_to_practice_required"], "not_found")

    def test_list_keeps_only_found_items_and_non_empty_means_required(self):
        result = check_record(answer(), self.texts)
        self.assertEqual(result["states"]["certificates_or_licences"], "required")
        self.assertEqual(
            [c["name"] for c in result["found"]["certificates_or_licences"]], ["ISO 9001"]
        )

    def test_empty_list_is_not_found(self):
        self.assertEqual(self.states["named_specialists"], "not_found")

    def test_list_with_only_unfound_quotes_is_not_found(self):
        rec = answer()
        rec["certificates_or_licences"] = rec["certificates_or_licences"][1:]
        self.assertEqual(
            check_record(rec, self.texts)["states"]["certificates_or_licences"], "not_found"
        )

    def test_record_is_returned_unchanged_in_schema_shape(self):
        result = check_record(answer(), self.texts)
        self.assertEqual(result["record"], answer())

    def test_unfound_quotes_are_listed(self):
        result = check_record(answer(), self.texts)
        fields = {u["field"] for u in result["unfound_quotes"]}
        self.assertEqual(fields, {"similar_contracts", "certificates_or_licences[1]"})

    def test_quote_in_a_different_file_than_the_named_one_is_not_found(self):
        rec = answer()
        rec["min_turnover"]["file"] = "INVENTED_techninė_specifikacija.txt"
        self.assertEqual(check_record(rec, self.texts)["states"]["min_turnover"], "not_found")


class StrictQuoteMatching(unittest.TestCase):
    """Findings from the security review of the Quote check."""

    TEXTS = {
        "a.txt": "Tiekejas turi buti ISO 9001 sertifikuotas ir turi patirti maziausiai trejus metus. Kita eilute.",
        "b.txt": "Visai kitas dokumentas, kuriame yra tik bid security reikalavimas dvidesimt tukstanciu.",
    }

    def found(self, quote, file="a.txt"):
        from reading import normalise, quote_found
        norm = {f: normalise(t) for f, t in self.TEXTS.items()}
        return quote_found(quote, norm, file)

    def test_plain_quote_in_named_file_is_found(self):
        self.assertTrue(self.found("Tiekejas turi buti ISO 9001 sertifikuotas"))

    def test_quote_of_only_ellipsis_or_whitespace_is_not_found(self):
        for q in ("...", "\u2026", "  ", "[...]", " ... \u2026 ", "", "|"):
            with self.subTest(q=q):
                self.assertFalse(self.found(q))

    def test_empty_segment_after_normalising_does_not_count(self):
        self.assertFalse(self.found("| ... |"))

    def test_quote_found_only_in_another_file_is_not_found(self):
        self.assertFalse(self.found("tik bid security reikalavimas dvidesimt", file="a.txt"))
        self.assertTrue(self.found("tik bid security reikalavimas dvidesimt", file="b.txt"))

    def test_missing_or_unknown_file_is_not_found(self):
        self.assertFalse(self.found("Tiekejas turi buti ISO 9001 sertifikuotas", file=None))
        self.assertFalse(self.found("Tiekejas turi buti ISO 9001 sertifikuotas", file="zzz.txt"))

    def test_too_short_quote_is_not_found(self):
        self.assertFalse(self.found("ISO 9001"))

    def test_tiny_segment_joined_by_ellipsis_is_not_found(self):
        self.assertFalse(self.found("Tiekejas turi buti ISO 9001 sertifikuotas ... ir ... metus"))

    def test_long_segments_joined_by_ellipsis_are_found_in_order(self):
        q = "Tiekejas turi buti ISO 9001 sertifikuotas ... maziausiai trejus metus. Kita"
        self.assertTrue(self.found(q))
        q2 = "maziausiai trejus metus. Kita ... Tiekejas turi buti ISO 9001 sertifikuotas"
        self.assertFalse(self.found(q2))

    def test_too_many_ellipsis_segments_is_not_found(self):
        q = " ... ".join(["Tiekejas turi buti", "ISO 9001 sertifikuotas", "ir turi patirti", "maziausiai trejus", "metus. Kita eilute"])
        self.assertFalse(self.found(q))

    def test_check_record_uses_the_named_file(self):
        texts = {"a.txt": self.TEXTS["a.txt"], "b.txt": self.TEXTS["b.txt"]}
        rec = {k: {"required": True, "quote": None, "file": None} for k in
               ("min_turnover", "similar_contracts", "right_to_practice_required", "bid_security")}
        rec["bid_security"] = {"required": True, "quote": "tik bid security reikalavimas dvidesimt", "file": "a.txt"}
        rec["certificates_or_licences"] = []
        rec["named_specialists"] = []
        rec["other_requirements"] = []
        self.assertEqual(check_record(rec, texts)["states"]["bid_security"], "not_found")
        rec["bid_security"]["file"] = "b.txt"
        self.assertEqual(check_record(rec, texts)["states"]["bid_security"], "required")


@unittest.skipUnless(os.path.isdir(REAL_TEXT), "real tender texts not present")
class QuoteCheckOnRealTenders(unittest.TestCase):
    # The one key quote that is not in the converted text, even by hand (ticket #4's closing comment).
    KNOWN_UNFOUND = [("10384200", "other_requirements[8]")]

    def tender_ids(self):
        return sorted(d for d in os.listdir(REAL_TEXT) if os.path.isdir(os.path.join(REAL_TEXT, d)))

    def test_every_hand_checked_key_has_its_tender_text(self):
        keys = sorted(f[:-5] for f in os.listdir(KEYS) if f.endswith(".json"))
        self.assertEqual(len(keys), 15)
        self.assertEqual(self.tender_ids(), keys)

    def test_hand_checked_keys_pass_their_own_quote_check(self):
        unfound = []
        for tid in self.tender_ids():
            with open(os.path.join(KEYS, tid + ".json"), encoding="utf-8") as f:
                key = json.load(f)
            result = check_record(key, load_texts(os.path.join(REAL_TEXT, tid)))
            unfound += [(tid, u["field"]) for u in result["unfound_quotes"]]
        self.assertEqual(unfound, self.KNOWN_UNFOUND)


if __name__ == "__main__":
    unittest.main()
