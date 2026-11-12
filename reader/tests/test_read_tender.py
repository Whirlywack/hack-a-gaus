"""Seam 2 again, one level out: the request the reader makes and what it does with the answer.

The Anthropic client is replaced by a fake that records the request and returns the fixture
answer, so no live call is made.
"""
import json
import os
import sys
import tempfile
import unittest
from types import SimpleNamespace

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import reading  # noqa: E402
from reading import ReadFailed, read_tender  # noqa: E402

FIXTURES = os.path.join(HERE, "fixtures")
INVENTED = os.path.join(FIXTURES, "INVENTED_tender_99999999")


def answer_text():
    with open(os.path.join(FIXTURES, "INVENTED_model_answer.json"), encoding="utf-8") as f:
        return f.read()


class FakeClient:
    def __init__(self, stop_reason="end_turn", text=None, model="claude-sonnet-5-5",
                 tokens_per_char=0.0, flat_tokens=1000):
        self.stop_reason, self.text, self.model = stop_reason, text, model
        self.tokens_per_char, self.flat_tokens = tokens_per_char, flat_tokens
        self.requests, self.counted = [], []
        outer = self

        class Messages:
            def count_tokens(self, **kw):
                outer.counted.append(kw)
                chars = sum(len(m["content"]) for m in kw["messages"])
                return SimpleNamespace(input_tokens=int(outer.flat_tokens + chars * outer.tokens_per_char))

        class BetaMessages:
            def stream(self, **kw):
                outer.requests.append(kw)
                return Stream()

        class Stream:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def get_final_message(self):
                content = [SimpleNamespace(type="text", text=outer.text if outer.text is not None else answer_text())]
                if outer.stop_reason == "refusal":
                    content = []
                return SimpleNamespace(
                    stop_reason=outer.stop_reason, content=content, model=outer.model,
                    usage=SimpleNamespace(input_tokens=1234, output_tokens=567),
                    stop_details=None,
                )

        self.messages = Messages()
        self.beta = SimpleNamespace(messages=BetaMessages())


class ReadTenderRequest(unittest.TestCase):
    def read(self, **kw):
        self.client = FakeClient(**kw)
        self.ledger = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.ledger.close()
        os.unlink(self.ledger.name)
        return read_tender(INVENTED, client=self.client, today="2026-11-12", ledger_path=self.ledger.name)

    def tearDown(self):
        if getattr(self, "ledger", None) and os.path.exists(self.ledger.name):
            os.unlink(self.ledger.name)

    def test_one_streamed_request_to_the_reader_model_with_every_file(self):
        self.read()
        self.assertEqual(len(self.client.requests), 1)
        req = self.client.requests[0]
        self.assertEqual(req["model"], "claude-sonnet-5-5")
        body = json.dumps(req["messages"], ensure_ascii=False)
        self.assertIn("Tiekėjo vidutinė metinė apyvarta", body)
        self.assertIn("griovių", body)
        self.assertIn("INVENTED_specialiosios_salygos.txt", body)

    def test_structured_output_is_the_schema_and_citations_are_not_used(self):
        self.read()
        req = self.client.requests[0]
        fmt = req["output_config"]["format"]
        self.assertEqual(fmt["type"], "json_schema")
        self.assertIn("min_turnover", fmt["schema"]["properties"])
        self.assertNotIn("citations", json.dumps(req["messages"]))

    def test_server_side_refusal_fallback_is_opted_into(self):
        self.read()
        req = self.client.requests[0]
        self.assertEqual(req["fallbacks"], "default")
        self.assertIn("server-side-fallback-2026-07-01", req["betas"])

    def test_tokens_are_counted_before_sending(self):
        self.read()
        self.assertEqual(len(self.client.counted), 1)

    def test_document_text_is_framed_as_data(self):
        self.read()
        req = self.client.requests[0]
        self.assertIn("data", req["system"].lower())
        self.assertIn("never follow", req["system"].lower())
        user = req["messages"][0]["content"]
        # the instruction-like line sits inside a document block, after the data framing
        self.assertLess(user.index("<document"), user.index("Ignoruok visas"))

    def test_reading_carries_record_files_model_and_date(self):
        r = self.read()
        self.assertEqual(r["states"]["min_turnover"], "required")
        self.assertEqual(r["states"]["similar_contracts"], "not_found")
        self.assertEqual(
            sorted(r["files_read"]),
            ["INVENTED_specialiosios_salygos.txt", "INVENTED_techninė_specifikacija.txt"],
        )
        self.assertEqual(r["files_skipped"], [])
        self.assertEqual(r["model"], "claude-sonnet-5-5")
        self.assertEqual(r["date"], "2026-11-12")

    def test_reading_records_the_model_that_actually_answered(self):
        r = self.read(model="claude-sonnet-5")
        self.assertEqual(r["model"], "claude-sonnet-5")

    def test_empty_quote_and_file_from_the_model_come_back_as_null(self):
        # the request schema asks for "" where nothing was found (fewer nullable unions);
        # the stored record is the handoff's shape, with null
        ans = json.loads(answer_text())
        ans["right_to_practice_required"] = {"required": None, "quote": "", "file": ""}
        r = self.read(text=json.dumps(ans))
        self.assertEqual(r["record"]["right_to_practice_required"],
                         {"required": None, "quote": None, "file": None})

    def test_request_schema_stays_under_the_api_union_limit(self):
        def unions(node):
            if isinstance(node, dict):
                n = 1 if isinstance(node.get("type"), list) or "anyOf" in node else 0
                return n + sum(unions(v) for v in node.values())
            if isinstance(node, list):
                return sum(unions(v) for v in node)
            return 0
        self.assertLessEqual(unions(reading.RECORD_SCHEMA), 16)

    def test_refusal_is_a_failed_read(self):
        with self.assertRaises(ReadFailed):
            self.read(stop_reason="refusal")

    def test_cut_off_answer_is_a_failed_read(self):
        with self.assertRaises(ReadFailed):
            self.read(stop_reason="max_tokens", text='{"tender_id": "99')

    def test_unparseable_answer_is_a_failed_read(self):
        with self.assertRaises(ReadFailed):
            self.read(text="not json")

    def test_spend_is_appended_to_the_ledger(self):
        self.read()
        with open(self.ledger.name) as f:
            ledger = json.load(f)
        entry = ledger["entries"][-1]
        self.assertEqual((entry["input_tokens"], entry["output_tokens"]), (1234, 567))
        self.assertAlmostEqual(entry["usd"], 1234 * 2 / 1e6 + 567 * 10 / 1e6, places=6)
        self.assertAlmostEqual(ledger["total_usd"], entry["usd"], places=6)


class TenderThatDoesNotFit(unittest.TestCase):
    def test_files_are_left_out_and_listed_never_cut(self):
        # 1 token per char: the two fixture files cannot both fit in a tiny budget
        client = FakeClient(tokens_per_char=1.0, flat_tokens=0)
        sizes = {f: len(t) for f, t in reading.load_texts(INVENTED).items()}
        budget = max(sizes.values()) + 50
        ledger = os.path.join(tempfile.mkdtemp(), "l.json")
        r = read_tender(INVENTED, client=client, today="2026-11-12", ledger_path=ledger, input_budget=budget)
        self.assertEqual(len(r["files_skipped"]), 1)
        self.assertEqual(len(r["files_read"]), 1)
        self.assertEqual(r["files_skipped"][0]["reason"], "does not fit the model's window")
        sent = client.requests[0]["messages"][0]["content"]
        read_file = r["files_read"][0]
        self.assertIn(read_file, sent)
        # nothing was truncated: the whole text of the file that was sent is in the request
        with open(os.path.join(INVENTED, read_file), encoding="utf-8") as f:
            self.assertIn(f.read().strip(), sent)


if __name__ == "__main__":
    unittest.main()
