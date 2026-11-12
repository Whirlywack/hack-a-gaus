"""Tests for the convert-and-report seam.
Run from the repo root: python3 -m unittest discover -s reader -p "test_convert_tender.py"
"""
import io
import json
import os
import tempfile
import unittest
import zipfile

import convert_tender as ct


def fake(text):
    return lambda path: text


class ConvertTree(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.src = os.path.join(self.tmp.name, "docs")
        self.out = os.path.join(self.tmp.name, "text")
        os.makedirs(self.src)

    def tearDown(self):
        self.tmp.cleanup()

    def put(self, name, data=b"x"):
        with open(os.path.join(self.src, name), "wb") as f:
            f.write(data)

    def run_tree(self, **conv):
        base = {k: fake("a" * 500) for k in ("docx", "doc", "pdf", "xlsx", "xls")}
        base.update(conv)
        entries = ct.convert_tree(self.src, self.out, converters=base)
        return {e["file"]: e for e in entries}

    def test_each_format_is_read_with_its_char_length(self):
        names = ("a.docx", "b.doc", "c.pdf", "d.xlsx", "e.xls")
        for n in names:
            self.put(n)
        e = self.run_tree()
        for n in names:
            self.assertEqual(e[n]["status"], "read")
            self.assertEqual(e[n]["chars"], 500)

    def test_scanned_pdf_is_skipped_with_reason(self):
        self.put("scan.pdf")
        e = self.run_tree(pdf=fake("  \n "))["scan.pdf"]
        self.assertEqual(e["status"], "skipped")
        self.assertIn("scanned", e["reason"])

    def test_zip_members_are_read_and_nested_zip_is_skipped(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("inner.docx", "x")
            z.writestr("../evil.pdf", "x")
            z.writestr("EBVPD.zip", "x")
        self.put("pack.zip", buf.getvalue())
        e = self.run_tree()
        self.assertEqual(e["pack.zip/inner.docx"]["status"], "read")
        self.assertEqual(e["pack.zip/evil.pdf"]["status"], "read")
        self.assertEqual(e["pack.zip/EBVPD.zip"]["status"], "skipped")
        self.assertIn("nested zip", e["pack.zip/EBVPD.zip"]["reason"])
        self.assertFalse(os.path.exists(os.path.join(self.tmp.name, "evil.pdf")))

    def test_hostile_zip_members_are_skipped_with_a_reason_and_the_rest_still_read(self):
        long_extract = "n" * 300 + ".pdf"        # too long to unpack under any file system
        long_text = "m" * 241 + ".pdf"           # unpacks, but its text file name is too long
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr(zipfile.ZipInfo(".."), "x")
            z.writestr(zipfile.ZipInfo("."), "x")
            z.writestr("a/doc.pdf", "x")
            z.writestr("b/doc.pdf", "x")
            z.writestr(long_extract, "x")
            z.writestr(long_text, "x")
            z.writestr("crc.pdf", "ORIGINALDATA")
            z.writestr("inner.docx", "x")
        self.put("pack.zip", buf.getvalue().replace(b"ORIGINALDATA", b"CORRUPTEDDAT"))

        entries = ct.convert_tree(self.src, self.out, converters={
            k: fake("a" * 500) for k in ("docx", "doc", "pdf", "xlsx", "xls")})
        e = {x["file"]: x for x in entries}

        self.assertEqual(len(entries), 8)
        for bad in ("pack.zip/..", "pack.zip/.", "pack.zip/" + long_extract,
                    "pack.zip/" + long_text, "pack.zip/crc.pdf"):
            with self.subTest(bad=bad[:40]):
                self.assertEqual(e[bad]["status"], "skipped")
                self.assertTrue(e[bad]["reason"])
        docs = [x for x in entries if x["file"].endswith("doc.pdf")]
        self.assertEqual([x["status"] for x in docs], ["read", "read"])
        self.assertEqual(len({x["file"] for x in docs}), 2)
        self.assertEqual(e["pack.zip/inner.docx"]["status"], "read")
        self.assertEqual(len(os.listdir(self.out)), 3)  # both doc.pdf texts and inner.docx

    def test_unsupported_and_broken_files_are_skipped_not_fatal(self):
        self.put("plan.dwg")
        self.put("bad.docx")
        self.put("not-a-zip.zip", b"junk")

        def boom(path):
            raise ValueError("broken")
        e = self.run_tree(docx=boom)
        self.assertIn("unsupported", e["plan.dwg"]["reason"])
        self.assertIn("failed", e["bad.docx"]["reason"])
        self.assertIn("not a zip", e["not-a-zip.zip"]["reason"])

    def test_report_carries_no_document_text(self):
        self.put("a.docx")
        e = self.run_tree(docx=fake("SECRET Jonas +37060000000 " * 30))
        lines = "\n".join(ct.report_lines(list(e.values())))
        self.assertIn("a.docx", lines)
        self.assertIn("read", lines)
        self.assertIn("779 chars", lines)
        for blob in (lines, json.dumps(e)):
            self.assertNotIn("SECRET", blob)
            self.assertNotIn("37060000000", blob)


if __name__ == "__main__":
    unittest.main()
