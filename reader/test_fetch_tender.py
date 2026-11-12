"""Run from the repo root: python3 -m unittest discover -s reader -p "test_fetch_tender.py" """
import unittest

import fetch_tender as ft


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
