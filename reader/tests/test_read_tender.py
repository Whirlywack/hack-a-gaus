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
                 tokens_per_char=0.0, flat_tokens=1000, content=None, usage=None):
        self.stop_reason, self.text, self.model = stop_reason, text, model
        self.tokens_per_char, self.flat_tokens = tokens_per_char, flat_tokens
        self.content, self.usage = content, usage
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
                if outer.content is not None:
                    content = outer.content
                return SimpleNamespace(
                    stop_reason=outer.stop_reason, content=content, model=outer.model,
                    usage=outer.usage or SimpleNamespace(input_tokens=1234, output_tokens=567),
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

    def test_the_answer_may_use_the_models_whole_output_limit_because_thinking_counts_toward_it(self):
        # Context windows: "Thinking tokens are a subset of your max_tokens parameter";
        # claude-sonnet-5-5 "can generate up to 128k output tokens (max_tokens)"
        self.read()
        self.assertEqual(self.client.requests[0]["max_tokens"], 128_000)

    def test_a_tender_that_fits_the_window_is_sent_whole(self):
        # Spec: files are left out only "if a tender does not fit the model's window". Context
        # windows: on Claude 4.5 and newer, input plus max_tokens past the window is accepted and
        # stops on model_context_window_exceeded, a failed read. So the input budget keeps 32K free
        # for the answer, about 7 times the longest read in scoring run sonnet-1 (4,810 output
        # tokens), not the whole 128K. 10392051, the largest hand-checked tender, billed 841,604.
        r = self.read(flat_tokens=940_000)
        self.assertEqual(r["files_skipped"], [])
        self.assertEqual(len(self.client.requests), 1)

    def test_input_that_leaves_less_than_32k_for_the_answer_is_not_sent(self):
        with self.assertRaises(ReadFailed):
            self.read(flat_tokens=960_000)  # 960K + 32K + the 20K margin is past the 1M window
        self.assertEqual(self.client.requests, [])

    def test_thinking_is_adaptive_at_an_explicit_effort(self):
        # claude-sonnet-5-5 thinks when `thinking` is omitted and rejects budget_tokens with a 400:
        # effort is the only thinking control. "high" is the API default the scored run used.
        self.read()
        req = self.client.requests[0]
        self.assertEqual(req["thinking"], {"type": "adaptive"})
        self.assertEqual(req["output_config"]["effort"], "high")

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

    def test_model_is_told_the_rules_its_quotes_are_checked_against(self):
        # a quote the Quote check would throw away must not look acceptable to the model
        self.read()
        system = self.client.requests[0]["system"]
        self.assertIn("at least %d characters" % reading.MIN_SEGMENT_CHARS, system)
        self.assertIn("at most %d pieces" % reading.MAX_SEGMENTS, system)
        # the request schema has no null quote or file: the model is told to send ""
        self.assertIn('empty strings ("")', system)
        self.assertNotIn("null quote", system)

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

    def test_answer_the_fallback_model_finished_after_a_mid_stream_refusal_is_read_whole(self):
        # Refusals and fallback, Streaming: after a mid-output decline the partial text stays, a
        # `fallback` block marks the boundary, and the fallback model continues in a new text block.
        whole = answer_text()
        cut = whole.index('"similar_contracts"')
        r = self.read(model="claude-sonnet-5", content=[
            SimpleNamespace(type="text", text=whole[:cut]),
            SimpleNamespace(type="fallback", to=SimpleNamespace(model="claude-sonnet-5")),
            SimpleNamespace(type="text", text=whole[cut:]),
        ])
        self.assertEqual(r["states"]["min_turnover"], "required")
        self.assertEqual(r["states"]["bid_security"], "not_required")
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
        for reason in ("max_tokens", "model_context_window_exceeded"):
            with self.subTest(reason=reason), self.assertRaises(ReadFailed):
                self.read(stop_reason=reason, text='{"tender_id": "99')

    def test_unparseable_answer_is_a_failed_read(self):
        with self.assertRaises(ReadFailed):
            self.read(text="not json")

    def test_ledger_counts_every_attempt_of_a_read_the_fallback_model_finished(self):
        # usage.iterations is the per-attempt record of what is billed: a refusal that declined
        # mid-stream is billed too, while the top-level usage covers only the attempt that answered
        usage = SimpleNamespace(input_tokens=900, output_tokens=500, iterations=[
            SimpleNamespace(type="message", model="claude-sonnet-5-5", input_tokens=1000, output_tokens=300),
            SimpleNamespace(type="fallback_message", model="claude-sonnet-5", input_tokens=900, output_tokens=500),
        ])
        self.read(model="claude-sonnet-5", usage=usage)
        with open(self.ledger.name) as f:
            entry = json.load(f)["entries"][-1]
        self.assertEqual((entry["input_tokens"], entry["output_tokens"]), (1900, 800))
        self.assertAlmostEqual(entry["usd"], 0.0118, places=6)  # both Sonnets: 2 / 10 USD per million

    def test_spend_is_appended_to_the_ledger(self):
        self.read()
        with open(self.ledger.name) as f:
            ledger = json.load(f)
        entry = ledger["entries"][-1]
        self.assertEqual((entry["input_tokens"], entry["output_tokens"]), (1234, 567))
        self.assertAlmostEqual(entry["usd"], 1234 * 2 / 1e6 + 567 * 10 / 1e6, places=6)
        self.assertAlmostEqual(ledger["total_usd"], entry["usd"], places=6)


class UsageAndModels(unittest.TestCase):
    """What the scoring run needs from one read: the API's token count, and a comparison model."""

    def read(self, model="claude-sonnet-5-5", **kw):
        self.client = FakeClient(model=model, **kw)
        self.ledger = os.path.join(tempfile.mkdtemp(), "l.json")
        return read_tender(INVENTED, client=self.client, today="2026-11-12", ledger_path=self.ledger,
                           model=model, label="test")

    def ledger_entry(self):
        with open(self.ledger) as f:
            return json.load(f)["entries"][-1]

    def test_reading_carries_the_token_count_the_api_returned(self):
        r = self.read()
        self.assertEqual(r["usage"]["input_tokens"], 1234)
        self.assertEqual(r["usage"]["output_tokens"], 567)
        self.assertEqual(r["usage"]["counted_input_tokens"], 1000)
        self.assertAlmostEqual(r["usage"]["usd"], self.ledger_entry()["usd"], places=6)

    def test_haiku_request_names_haiku_and_has_no_server_side_fallback(self):
        # Claude Haiku 5.5 has no server-side refusal fallback
        self.read(model="claude-haiku-5-5")
        req = self.client.requests[0]
        self.assertEqual(req["model"], "claude-haiku-5-5")
        self.assertNotIn("fallbacks", req)
        self.assertNotIn("betas", req)
        self.assertEqual(self.client.counted[0]["model"], "claude-haiku-5-5")

    def test_haiku_is_priced_at_its_own_rate(self):
        # 0.10 / 0.50 USD per million tokens for prompts up to 100 000 tokens
        self.read(model="claude-haiku-5-5")
        self.assertAlmostEqual(self.ledger_entry()["usd"], 1234 * 0.10 / 1e6 + 567 * 0.50 / 1e6, places=6)

    def test_long_haiku_prompts_are_priced_at_the_higher_rate(self):
        self.assertAlmostEqual(reading.usd("claude-haiku-5-5", 200_000, 1_000), 200_000 * 0.5 / 1e6 + 1_000 * 2.5 / 1e6)
        self.assertAlmostEqual(reading.usd("claude-haiku-5-5", 100_000, 1_000), 100_000 * 0.1 / 1e6 + 1_000 * 0.5 / 1e6)

    def test_sonnet_price_is_unchanged(self):
        self.assertAlmostEqual(reading.usd("claude-sonnet-5-5", 1_000_000, 100_000), 2.0 + 1.0)

    def test_an_unknown_answering_model_is_priced_at_the_dearest_known_rate(self):
        self.assertGreaterEqual(reading.usd("claude-something-new", 1_000_000, 0), 2.0)


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
