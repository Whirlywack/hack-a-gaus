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

    def test_quote_must_come_from_the_named_file_or_any_file(self):
        rec = answer()
        rec["min_turnover"]["file"] = "INVENTED_techninė_specifikacija.txt"
        # still found word for word in some file of the tender
        self.assertEqual(check_record(rec, self.texts)["states"]["min_turnover"], "required")


@unittest.skipUnless(os.path.isdir(REAL_TEXT), "real tender texts not present")
class QuoteCheckOnRealTenders(unittest.TestCase):
    def test_hand_checked_keys_pass_their_own_quote_check(self):
        ids = sorted(d for d in os.listdir(REAL_TEXT) if os.path.isdir(os.path.join(REAL_TEXT, d)))
        self.assertTrue(ids)
        for tid in ids:
            key_path = os.path.join(KEYS, tid + ".json")
            if not os.path.exists(key_path):
                continue
            with self.subTest(tender=tid):
                with open(key_path, encoding="utf-8") as f:
                    key = json.load(f)
                result = check_record(key, load_texts(os.path.join(REAL_TEXT, tid)))
                # tolerate a few key quotes that were paraphrased; report them via the subtest
                self.assertLessEqual(len(result["unfound_quotes"]), 3, result["unfound_quotes"])


if __name__ == "__main__":
    unittest.main()
