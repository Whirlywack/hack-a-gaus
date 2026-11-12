"""Run from the repo root: python3 -m unittest discover -s reader -p "test_fetch_tender.py" """
import contextlib
import io
import os
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest import mock

import fetch_tender as ft

CAP = 64 * 1024


class FakePortal(BaseHTTPRequestHandler):
    """The three portal pages on 127.0.0.1, listing the documents in `listing`. Document 12 is
    bigger than CAP and is sent the way a server streams it: no Content-Length, body ends when
    the connection closes. Every other document is small."""
    user_agents = []
    listing = []
    notice_to_login = False   # the notice page redirects to a login, as a portal refusing us might

    def log_message(self, *args):
        pass

    def do_GET(self):
        FakePortal.user_agents.append(self.headers.get("User-Agent", ""))
        if "prepareViewCfTWS" in self.path and FakePortal.notice_to_login:
            self.send_response(302)
            self.send_header("Location", "/epps/authenticate/login;jsessionid=S3SSION?ticket=S3CRET")
            self.send_header("Content-Length", "0")
            self.end_headers()
        elif "authenticate/login" in self.path:
            self._send(b"<html>Prisijungimas</html>")
        elif "prepareViewCfTWS" in self.path:
            self._send(b"<html>Pirkimo vykdytojo pavadinimas</html>")
        elif "listContractDocuments" in self.path:
            self._send("".join("<tr><td><a onclick=\"downloadDocForAnonymous('%s')\">%s</a></td></tr>" % d
                               for d in FakePortal.listing).encode())
        elif "documentId=12&" not in self.path:
            self._send(b"%PDF small " * 100)
        else:
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.end_headers()
            try:
                for _ in range(64):
                    self.wfile.write(b"x" * 16384)  # 1 MiB in all, never announced
            except (BrokenPipeError, ConnectionResetError):
                pass

    def _send(self, body):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class FetchFromFakePortal(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), FakePortal)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.tmp = tempfile.TemporaryDirectory()
        self.docs = os.path.join(self.tmp.name, "docs")
        FakePortal.user_agents = []
        FakePortal.notice_to_login = False

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.tmp.cleanup()

    def fetch(self, listing):
        FakePortal.listing = listing
        log = io.StringIO()
        with mock.patch.multiple(ft, BASE="http://127.0.0.1:%d" % self.server.server_port,
                                 DELAY=0, MAX_TOTAL=CAP), \
                mock.patch.dict(os.environ, {"FETCHER_CONTACT": "ops@example.invalid"}), \
                contextlib.redirect_stdout(log):
            code = ft.main(["1", os.path.join(self.tmp.name, "work"), self.docs])
        return code, log.getvalue()

    def test_document_over_the_cap_without_content_length_is_skipped_with_a_reason(self):
        code, log = self.fetch([("11", "small.pdf"), ("12", "big.pdf")])

        self.assertEqual(code, 0)
        self.assertEqual(sorted(os.listdir(self.docs)), ["11_small.pdf"])
        big = [line for line in log.splitlines() if "big.pdf" in line]
        self.assertEqual(len(big), 1)
        self.assertIn("not downloaded", big[0])
        self.assertIn("size cap", big[0])
        self.assertIn("documents downloaded: 1 of 2", log)
        self.assertTrue(all("ops@example.invalid" in ua for ua in FakePortal.user_agents))

    def test_notice_page_sent_to_a_login_is_not_served_and_the_log_says_where_it_ended(self):
        FakePortal.notice_to_login = True
        code, log = self.fetch([("11", "small.pdf")])

        self.assertEqual(code, 2)
        self.assertIn("redirected to 127.0.0.1:%d/epps/authenticate/login" % self.server.server_port, log)
        self.assertNotIn("S3SSION", log)
        self.assertNotIn("S3CRET", log)
        self.assertEqual(os.listdir(self.docs), [])

    def test_document_whose_name_is_too_long_to_save_is_passed_over(self):
        code, log = self.fetch([("13", "n" * 300 + ".pdf"), ("11", "small.pdf")])

        self.assertEqual(code, 0)
        self.assertEqual(sorted(os.listdir(self.docs)), ["11_small.pdf"])
        self.assertIn("documents downloaded: 1 of 2", log)


class UserAgent(unittest.TestCase):
    def test_identifies_gaus_and_carries_the_contact(self):
        ua = ft.user_agent({"FETCHER_CONTACT": "ops@example.invalid"})
        self.assertIn("gaus", ua)
        self.assertIn("ops@example.invalid", ua)

    def test_missing_contact_is_an_error(self):
        for env in ({}, {"FETCHER_CONTACT": "  "}):
            with self.assertRaises(SystemExit):
                ft.user_agent(env)


class DocumentList(unittest.TestCase):
    def test_parses_anonymous_download_links(self):
        html = ("<tr><td><a onclick=\"downloadDocForAnonymous('123')\">Sąlygos.docx</a></td></tr>"
                "<tr><td><a href=x>other</a></td></tr>")
        self.assertEqual(ft.parse_documents(html), [("123", "Sąlygos.docx")])


if __name__ == "__main__":
    unittest.main()
