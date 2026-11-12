"""Seam 2, the scoring run: a Reading and its hand-checked key in, a verdict per field out.

Verdicts follow the rubric of handoff-from-claude/readings/score_sonnet_alone.md and score_cascade.md:
correct, wrong (a different value, or a partial set), missed (null, "unclear" or empty where the key
has a value) and invented (a value or item where the key has none). No live calls here.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

from score_keys import score_tender  # noqa: E402


def record(**fields):
    """A requirement record with nothing found, then the given fields."""
    rec = {
        "tender_id": "99999999",
        "qualification_requirements_set": "unclear",
        "min_turnover": {"required": None, "amount_eur": None, "period": None, "quote": None, "file": None},
        "similar_contracts": {"required": None, "count": None, "min_value_eur": None, "within_years": None,
                              "description": None, "quote": None, "file": None},
        "certificates_or_licences": [],
        "named_specialists": [],
        "right_to_practice_required": {"required": None, "quote": None, "file": None},
        "bid_security": {"required": None, "amount": None, "quote": None, "file": None},
        "exclusion_grounds": "unclear",
        "other_requirements": [],
        "notes": "",
    }
    rec.update(fields)
    return rec


class EnumFields(unittest.TestCase):
    def verdict(self, field, key_value, reading_value):
        cells = score_tender(record(**{field: key_value}), record(**{field: reading_value}))
        return cells[field]["verdict"]

    def test_same_value_is_correct(self):
        self.assertEqual(self.verdict("qualification_requirements_set", "yes", "yes"), "correct")
        self.assertEqual(self.verdict("exclusion_grounds", "declaration", "declaration"), "correct")

    def test_unclear_where_the_key_has_a_value_is_missed(self):
        self.assertEqual(self.verdict("qualification_requirements_set", "no", "unclear"), "missed")
        self.assertEqual(self.verdict("exclusion_grounds", "none", "unclear"), "missed")

    def test_a_different_value_is_wrong(self):
        self.assertEqual(self.verdict("exclusion_grounds", "declaration", "espd"), "wrong")
        self.assertEqual(self.verdict("qualification_requirements_set", "no", "yes"), "wrong")


def single(required, quote=None, file=None, **values):
    return dict(values, required=required, quote=quote, file=file)


class RequiredFields(unittest.TestCase):
    def cell(self, field, key_entry, reading_entry):
        return score_tender(record(**{field: key_entry}), record(**{field: reading_entry}))[field]

    def test_same_required_value_is_correct(self):
        for field in ("right_to_practice_required", "bid_security"):
            with self.subTest(field=field):
                self.assertEqual(self.cell(field, single(True), single(True))["verdict"], "correct")
                self.assertEqual(self.cell(field, single(False), single(False))["verdict"], "correct")
                self.assertEqual(self.cell(field, single(None), single(None))["verdict"], "correct")

    def test_required_left_null_is_missed(self):
        self.assertEqual(self.cell("right_to_practice_required", single(True), single(None))["verdict"], "missed")

    def test_explicit_not_required_left_null_is_a_soft_miss(self):
        # 10378522, 10384200, 10392051, 10393450 in score_sonnet_alone.md
        cell = self.cell("right_to_practice_required", single(False), single(None))
        self.assertEqual(cell["verdict"], "missed")
        self.assertTrue(cell["soft"])

    def test_required_where_the_key_has_nothing_is_invented(self):
        # 10389181 right to practise in score_cascade.md
        cell = self.cell("right_to_practice_required", single(None), single(True))
        self.assertEqual(cell["verdict"], "invented")

    def test_not_required_where_the_key_has_null_is_a_soft_wrong(self):
        # 10383512 right to practise in score_cascade.md
        cell = self.cell("right_to_practice_required", single(None), single(False))
        self.assertEqual(cell["verdict"], "wrong")
        self.assertTrue(cell["soft"])

    def test_opposite_value_is_wrong_and_not_soft(self):
        # 10389970 right to practise in score_cascade.md
        cell = self.cell("right_to_practice_required", single(False), single(True))
        self.assertEqual(cell["verdict"], "wrong")
        self.assertFalse(cell["soft"])

    def test_turnover_and_similar_contracts_compare_required_too(self):
        self.assertEqual(self.cell("min_turnover", single(False), single(False))["verdict"], "correct")
        self.assertEqual(self.cell("similar_contracts", single(True), single(None))["verdict"], "missed")


class Thresholds(unittest.TestCase):
    """When both say a past-contract or turnover requirement applies, its numbers are decisive too."""

    def cell(self, field, key_entry, reading_entry):
        return score_tender(record(**{field: key_entry}), record(**{field: reading_entry}))[field]

    def test_same_numbers_are_correct(self):
        k = single(True, count=1, min_value_eur=38200, within_years=3)
        r = single(True, count=1, min_value_eur=38200.0, within_years=3)
        self.assertEqual(self.cell("similar_contracts", k, r)["verdict"], "correct")

    def test_a_different_value_threshold_is_wrong(self):
        # lot II's 23 800 instead of the strictest lot's 38 200
        k = single(True, count=1, min_value_eur=38200, within_years=3)
        r = single(True, count=1, min_value_eur=23800, within_years=3)
        cell = self.cell("similar_contracts", k, r)
        self.assertEqual(cell["verdict"], "wrong")
        self.assertIn("min_value_eur", cell["why"])

    def test_a_number_the_key_leaves_open_is_wrong_when_filled(self):
        # 10324146: "pagal vieną ar daugiau sutarčių" sets no count
        k = single(True, count=None, min_value_eur=120000, within_years=3)
        r = single(True, count=1, min_value_eur=120000, within_years=3)
        self.assertEqual(self.cell("similar_contracts", k, r)["verdict"], "wrong")

    def test_turnover_amount_is_decisive(self):
        k = single(True, amount_eur=100000, period="per year")
        r = single(True, amount_eur=50000, period="per year")
        self.assertEqual(self.cell("min_turnover", k, r)["verdict"], "wrong")

    def test_numbers_do_not_matter_when_not_required(self):
        k = single(False, amount_eur=None)
        r = single(False, amount_eur=0)
        self.assertEqual(self.cell("min_turnover", k, r)["verdict"], "correct")


ISO = ("Rangovas atliekamiems statybos darbams taiko aplinkos apsaugos vadybos sistemos reikalavimus "
       "pagal standartą LST EN ISO 14001", "spec.txt")
GEODESIST = ("b) specialistą, turintį geodezininko kvalifikacijos pažymėjimą.", "spec.txt")
LICENCE = ("Teikėjas garantuoja, kad turi visas Sutarties įvykdymui reikalingas licencijas.", "sutartis.txt")


def cert(name, quote_file):
    return {"name": name, "quote": quote_file[0], "file": quote_file[1]}


class ListFields(unittest.TestCase):
    def cell(self, key_items, reading_items, field="certificates_or_licences", tender="99999999"):
        key = record(**{field: key_items, "tender_id": tender})
        return score_tender(key, record(**{field: reading_items}))[field]

    def test_empty_against_empty_is_correct(self):
        self.assertEqual(self.cell([], [])["verdict"], "correct")

    def test_same_items_by_quote_are_correct_whatever_the_name(self):
        k = [cert("Environmental management system ISO 14001", ISO)]
        r = [cert("Aplinkos apsaugos vadybos sistema", ISO)]
        self.assertEqual(self.cell(k, r)["verdict"], "correct")

    def test_quote_that_contains_the_key_quote_matches(self):
        # 10377061: the reading quoted a longer passage that ends with the key's quote
        longer = ("Rangovas privalo laikytis šių sąlygų. " + ISO[0], ISO[1])
        self.assertEqual(self.cell([cert("ISO", ISO)], [cert("ISO", longer)])["verdict"], "correct")

    def test_empty_where_the_key_has_items_is_missed(self):
        self.assertEqual(self.cell([cert("ISO", ISO)], [])["verdict"], "missed")

    def test_items_where_the_key_has_none_are_invented(self):
        # contract boilerplate promoted to a certificate (score_cascade.md, 10396017)
        cell = self.cell([], [cert("visos licencijos", LICENCE)])
        self.assertEqual(cell["verdict"], "invented")
        self.assertEqual(cell["extra"][0]["quote"], LICENCE[0])

    def test_partial_set_is_wrong_and_lists_what_is_missing(self):
        # 10324146: the specialist's IATA certificate was not listed
        cell = self.cell([cert("ISO", ISO), cert("geodesist", GEODESIST)], [cert("ISO", ISO)])
        self.assertEqual(cell["verdict"], "wrong")
        self.assertEqual([i["quote"] for i in cell["unmatched_key"]], [GEODESIST[0]])

    def test_right_items_plus_boilerplate_is_wrong(self):
        # 10392051 in score_cascade.md
        cell = self.cell([cert("ISO", ISO)], [cert("ISO", ISO), cert("licencijos", LICENCE)])
        self.assertEqual(cell["verdict"], "wrong")

    def test_each_reading_item_matches_at_most_one_key_item(self):
        cell = self.cell([cert("ISO", ISO), cert("ISO again", ISO)], [cert("ISO", ISO)])
        self.assertEqual(cell["verdict"], "wrong")

    def test_named_specialists_are_scored_the_same_way(self):
        k = [{"role": "geodezininkas", "qualification": None, "quote": GEODESIST[0], "file": GEODESIST[1]}]
        self.assertEqual(self.cell(k, k, field="named_specialists")["verdict"], "correct")
        self.assertEqual(self.cell(k, [], field="named_specialists")["verdict"], "missed")


KEYS = os.path.join(os.path.dirname(HERE), "..", "handoff-from-claude", "readings", "key")


def real_key(tender):
    import json
    with open(os.path.join(KEYS, tender + ".json"), encoding="utf-8") as f:
        return json.load(f)


class ItemsMatchedByName(unittest.TestCase):
    def cell(self, key_items, reading_items, field="certificates_or_licences"):
        return score_tender(record(**{field: key_items}), record(**{field: reading_items}))[field]

    def test_same_certificate_quoted_from_another_sentence_matches_by_name(self):
        # 10383512: the key quotes the proof clause, the reading the specialist clause
        k = [cert("Geodezininko kvalifikacijos pažymėjimas (specialist's, issued by Nacionalinės žemės tarnybos)",
                  ("dėl b) punkte nurodyto specialisto pateikiamas Nacionalinės žemės tarnybos pažymėjimas", "a.txt"))]
        r = [cert("Geodezininko kvalifikacijos pažymėjimas (Nacionalinės žemės tarnybos)", GEODESIST)]
        cell = self.cell(k, r)
        self.assertEqual(cell["verdict"], "correct")
        # a match by name only is shown to the operator
        self.assertEqual(len(cell["name_only"]), 1)

    def test_one_shared_word_is_not_a_match(self):
        k = [cert("Kvalifikacijos atestatas", ISO)]
        r = [cert("Kvalifikacijos pažymėjimas", LICENCE)]
        self.assertEqual(self.cell(k, r)["verdict"], "wrong")

    def test_a_quote_match_wins_over_a_name_match(self):
        k = [cert("ISO 14001 sistema", ISO), cert("ISO 14001 sistema pagal standartą", LICENCE)]
        r = [cert("ISO 14001 sistema pagal standartą", ISO)]
        cell = self.cell(k, r)
        self.assertEqual([i["quote"] for i in cell["unmatched_key"]], [LICENCE[0]])


class ProductLevelKeyItem(unittest.TestCase):
    """10382017 lists the organic certificate of the offered product. The judged scoring counts
    certificates at supplier level (score_sonnet_alone.md), so that item is neither needed nor an error."""

    def setUp(self):
        self.key = real_key("10382017")
        certs = self.key["certificates_or_licences"]
        self.vmvt = next(c for c in certs if "maisto ir veterinarijos" in c["quote"])
        self.organic = next(c for c in certs if "ekologinės gamybos" in c["quote"])

    def verdict(self, items):
        return score_tender(self.key, record(certificates_or_licences=items))["certificates_or_licences"]["verdict"]

    def test_supplier_approval_alone_is_correct(self):
        self.assertEqual(self.verdict([self.vmvt]), "correct")

    def test_both_are_correct(self):
        self.assertEqual(self.verdict([self.vmvt, self.organic]), "correct")

    def test_product_certificate_alone_is_missed(self):
        self.assertEqual(self.verdict([self.organic]), "missed")


SONNET_ALONE = os.path.join(os.path.dirname(HERE), "..", "handoff-from-claude", "readings", "sonnet_alone")

# The judged table in score_sonnet_alone.md, section 2: correct, wrong, missed, invented.
JUDGED_SONNET_ALONE = {
    "qualification_requirements_set": (13, 0, 2, 0),
    "similar_contracts": (13, 0, 2, 0),
    "min_turnover": (15, 0, 0, 0),
    "certificates_or_licences": (12, 1, 2, 0),
    "named_specialists": (15, 0, 0, 0),
    "right_to_practice_required": (10, 0, 5, 0),
    "bid_security": (15, 0, 0, 0),
    "exclusion_grounds": (12, 0, 3, 0),
}


class SonnetAloneAgainstTheKeys(unittest.TestCase):
    """The free, decisive test: the earlier readings scored mechanically land on the judged 105 of 120."""

    def setUp(self):
        from score_keys import load_records, score_run
        self.result = score_run(load_records(KEYS), load_records(SONNET_ALONE))

    def test_per_field_counts_match_the_judged_table(self):
        for field, (c, w, m, i) in JUDGED_SONNET_ALONE.items():
            with self.subTest(field=field):
                got = self.result["per_field"][field]
                self.assertEqual((got["correct"], got["wrong"], got["missed"], got["invented"]), (c, w, m, i))

    def test_total_is_105_of_120_with_nothing_invented(self):
        total = self.result["total"]
        self.assertEqual((total["correct"], total["wrong"], total["missed"], total["invented"]), (105, 1, 14, 0))
        self.assertEqual(total["cells"], 120)

    def test_every_cell_that_is_not_correct_is_a_listed_disagreement(self):
        self.assertEqual(len(self.result["disagreements"]), 15)
        d = next(x for x in self.result["disagreements"]
                 if x["tender"] == "10382017" and x["field"] == "similar_contracts")
        self.assertEqual(d["verdict"], "missed")
        self.assertIn("38 200,00 Eur", d["key_quote"])
        self.assertTrue(d["key_file"].endswith(".txt"))

    def test_the_soft_misses_are_marked(self):
        soft = {(d["tender"], d["field"]) for d in self.result["disagreements"] if d["soft"]}
        self.assertEqual(soft, {(t, "right_to_practice_required")
                                for t in ("10378522", "10384200", "10392051", "10393450")}
                         | {("10397525", "similar_contracts")})


REAL_TEXT = os.environ.get(
    "GAUS_TENDER_TEXT_DIR",
    os.path.join(os.path.dirname(HERE), "..", "handoff-from-claude", "readings", "text"),
)


@unittest.skipUnless(os.path.isdir(REAL_TEXT), "real tender texts not present")
class SonnetAloneAsShown(unittest.TestCase):
    """The same 15 readings after the Quote check, as the product would show them."""

    @classmethod
    def setUpClass(cls):
        from reading import check_record, load_texts
        from score_keys import load_records, shown_record
        cls.keys = load_records(KEYS)
        cls.texts = {t: load_texts(os.path.join(REAL_TEXT, t)) for t in cls.keys}
        cls.checked = {t: check_record(r, cls.texts[t]) for t, r in load_records(SONNET_ALONE).items()}
        cls.shown = {t: shown_record(c) for t, c in cls.checked.items()}

    def test_every_sonnet_alone_quote_passes_the_quote_check(self):
        self.assertEqual({t: c["unfound_quotes"] for t, c in self.checked.items() if c["unfound_quotes"]}, {})

    def test_score_is_unchanged_after_the_quote_check(self):
        from score_keys import score_run
        total = score_run(self.keys, self.shown)["total"]
        self.assertEqual((total["correct"], total["wrong"], total["missed"], total["invented"]), (105, 1, 14, 0))

    def test_the_one_key_quote_not_found_is_outside_the_scored_fields(self):
        from reading import check_record
        unfound = [(t, u["field"]) for t in self.keys
                   for u in check_record(self.keys[t], self.texts[t])["unfound_quotes"]]
        self.assertEqual(unfound, [("10384200", "other_requirements[8]")])


FIXTURES = os.path.join(HERE, "fixtures")


class ScoredAfterTheQuoteCheck(unittest.TestCase):
    """A Reading is scored as it would be shown: a finding whose Quote is not in the text is not found."""

    def setUp(self):
        import json
        from reading import check_record, load_texts
        with open(os.path.join(FIXTURES, "INVENTED_model_answer.json"), encoding="utf-8") as f:
            self.answer = json.load(f)
        self.checked = check_record(self.answer, load_texts(os.path.join(FIXTURES, "INVENTED_tender_99999999")))

    def test_shown_record_drops_findings_whose_quote_is_not_found(self):
        from score_keys import shown_record
        shown = shown_record(self.checked)
        self.assertIsNone(shown["similar_contracts"]["required"])
        self.assertIsNone(shown["similar_contracts"]["quote"])
        self.assertEqual([c["name"] for c in shown["certificates_or_licences"]], ["ISO 9001"])
        self.assertIs(shown["min_turnover"]["required"], True)
        self.assertIs(shown["bid_security"]["required"], False)
        self.assertEqual(shown["qualification_requirements_set"], "yes")

    def test_a_perfect_answer_with_two_unfound_quotes_loses_those_two_cells(self):
        from score_keys import shown_record
        cells = score_tender(self.answer, shown_record(self.checked))
        self.assertEqual(cells["similar_contracts"]["verdict"], "missed")
        self.assertEqual(cells["certificates_or_licences"]["verdict"], "wrong")
        others = [f for f in cells if f not in ("similar_contracts", "certificates_or_licences")]
        self.assertTrue(all(cells[f]["verdict"] == "correct" for f in others))


class Report(unittest.TestCase):
    """The committed score report: totals, tokens per tender, and every disagreement with Quote and file."""

    def setUp(self):
        from score_keys import load_records, score_run
        self.result = score_run(load_records(KEYS), load_records(SONNET_ALONE))

    def render(self, **meta):
        from score_keys import render_report
        meta.setdefault("title", "sonnet_alone, scored mechanically")
        return render_report(self.result, meta)

    def test_report_is_pending_operator_judgement_and_has_the_totals(self):
        md = self.render()
        self.assertIn("pending operator judgement", md)
        self.assertIn("| certificates_or_licences | 12 | 1 | 2 | 0 |", md)
        self.assertIn("| **Total** | **105** | **1** | **14** | **0** |", md)

    def test_every_disagreement_shows_its_quote_and_file(self):
        md = self.render()
        for d in self.result["disagreements"]:
            with self.subTest(tender=d["tender"], field=d["field"]):
                self.assertIn("%s · %s" % (d["tender"], d["field"]), md)
        self.assertIn("38 200,00 Eur", md)
        self.assertIn("10382107_Pirkimo sąlygos", md)

    def test_tokens_per_tender_are_listed(self):
        md = self.render(usage={"10324146": {"counted_input_tokens": 50000, "input_tokens": 50123,
                                             "output_tokens": 4000, "usd": 0.140246, "model": "claude-sonnet-5-5"}})
        self.assertIn("| 10324146 | 50000 | 50123 | 4000 | 0.1402 | claude-sonnet-5-5 |", md)

    def test_contact_details_in_quotes_are_removed(self):
        from score_keys import scrub
        self.assertEqual(scrub("rašykite jonas.jonaitis@savivaldybe.lt arba"), "rašykite [e-mail removed] arba")
        self.assertEqual(scrub("tel. +370 612 34567."), "tel. [phone removed].")
        self.assertEqual(scrub("skambinkite 8 612 34567"), "skambinkite [phone removed]")
        self.assertEqual(scrub("tel. (8 5) 219 1234"), "tel. [phone removed]")
        # amounts stay as written
        for amount in ("ne mažesnė kaip 120 000,00 EUR be PVM", "8 000 Eur", "1 274 000 simbolių", "38 200,00 Eur"):
            self.assertEqual(scrub(amount), amount)


class LiveRun(unittest.TestCase):
    """The run itself, with the fake client from test_read_tender: no live call is made."""

    def setUp(self):
        import json
        import shutil
        import tempfile
        self.tmp = tempfile.mkdtemp()
        self.text_dir = os.path.join(self.tmp, "text")
        for tender in ("11111111", "22222222"):
            shutil.copytree(os.path.join(FIXTURES, "INVENTED_tender_99999999"), os.path.join(self.text_dir, tender))
        self.raw_dir = os.path.join(self.tmp, "raw")
        self.ledger = os.path.join(self.tmp, "ledger.json")
        self.json = json

    def start_ledger(self, total):
        with open(self.ledger, "w") as f:
            self.json.dump({"entries": [{"label": "earlier", "usd": total}], "total_usd": total}, f)

    def ledger_total(self):
        with open(self.ledger) as f:
            return self.json.load(f)["total_usd"]

    def run_live(self, client, cap=15.0):
        from score_keys import run_live
        return run_live(client, ["11111111", "22222222"], self.text_dir, self.raw_dir, model="claude-sonnet-5-5",
                        label="test run", ledger_path=self.ledger, cap_usd=cap, today="2026-11-12")

    def test_each_tender_is_read_and_its_raw_reading_saved(self):
        from test_read_tender import FakeClient
        self.start_ledger(0.021068)
        client = FakeClient()
        run = self.run_live(client)
        self.assertEqual(len(client.requests), 2)
        self.assertEqual(sorted(os.listdir(self.raw_dir)), ["11111111.json", "22222222.json"])
        self.assertEqual(run["usage"]["11111111"]["input_tokens"], 1234)
        self.assertEqual(run["usage"]["11111111"]["model"], "claude-sonnet-5-5")
        self.assertIsNone(run["stopped"])
        self.assertAlmostEqual(self.ledger_total(), 0.021068 + 2 * (1234 * 2 + 567 * 10) / 1e6, places=6)

    def test_the_run_stops_before_a_tender_that_could_take_the_ledger_past_the_cap(self):
        from test_read_tender import FakeClient
        # the worst case for one tender is its counted input plus max_tokens of output (0.32 USD here)
        self.start_ledger(14.80)
        client = FakeClient()
        run = self.run_live(client)
        self.assertEqual(client.requests, [])
        self.assertIn("15", run["stopped"])
        self.assertEqual(run["failures"], {"11111111": run["stopped"], "22222222": run["stopped"]})
        self.assertAlmostEqual(self.ledger_total(), 14.80)

    def test_the_total_is_checked_again_before_every_tender(self):
        from test_read_tender import FakeClient
        self.start_ledger(14.675)  # room for one worst case (0.322), not for a second after the first
        client = FakeClient()
        run = self.run_live(client)
        self.assertEqual(len(client.requests), 1)
        self.assertIn("22222222", run["failures"])
        self.assertLessEqual(self.ledger_total(), 15.0)

    def test_a_failed_read_is_recorded_and_the_run_goes_on(self):
        from test_read_tender import FakeClient
        self.start_ledger(0.0)
        run = self.run_live(FakeClient(stop_reason="refusal"))
        self.assertIsNone(run["readings"]["11111111"])
        self.assertIn("refusal", run["failures"]["11111111"])
        self.assertEqual(len(run["failures"]), 2)

    def test_an_error_during_the_call_is_charged_to_the_ledger_at_its_counted_input(self):
        from test_read_tender import FakeClient
        self.start_ledger(0.0)
        client = FakeClient()

        class Broken:
            def stream(self, **kw):
                raise ConnectionError("connection dropped")
        client.beta.messages = Broken()
        run = self.run_live(client)
        self.assertIn("ConnectionError", run["failures"]["11111111"])
        # the fake counts 1000 input tokens; the billed amount is unknown, so the input is charged
        self.assertAlmostEqual(self.ledger_total(), 2 * 1000 * 2 / 1e6, places=6)


class Outcome(unittest.TestCase):
    """The outcome record: per field, whether the reader's model ever gave a wrong or invented value.
    It decides which fields #16 may show; the operator's judgement can still change it."""

    def summary(self, title, model, bad):
        from score_keys import FIELDS
        per_field = {f: {"correct": 15, "wrong": 0, "missed": 0, "invented": 0} for f in FIELDS}
        return {"title": title, "model": model, "per_field": per_field,
                "total": {"correct": 110, "wrong": 1, "missed": 9, "invented": 0, "cells": 120},
                "wrong_or_invented": {f: bad.get(f, []) for f in FIELDS}}

    def test_fields_with_a_wrong_or_invented_value_in_any_reader_run_are_named(self):
        from score_keys import render_outcome
        md = render_outcome([
            self.summary("run 1", "claude-sonnet-5-5", {"certificates_or_licences": ["10324146"]}),
            self.summary("run 2", "claude-sonnet-5-5", {"exclusion_grounds": ["10393450"]}),
            self.summary("haiku", "claude-haiku-5-5", {"bid_security": ["10388453"]}),
        ], reader_model="claude-sonnet-5-5")
        self.assertIn("pending operator judgement", md)
        self.assertIn("| certificates_or_licences | yes: 10324146 (run 1) |", md)
        self.assertIn("| exclusion_grounds | yes: 10393450 (run 2) |", md)
        self.assertIn("| min_turnover | no |", md)
        # the comparison model does not decide which fields are shown
        self.assertIn("| bid_security | no |", md)
        self.assertIn("haiku", md)


if __name__ == "__main__":
    unittest.main()
