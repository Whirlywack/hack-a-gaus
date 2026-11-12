"""Tests for the convert-and-report seam.
Run from the repo root: python3 -m unittest discover -s reader -p "test_convert_tender.py"
"""
import importlib.util
import io
import json
import os
import shutil
import subprocess
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

    def test_text_is_cleaned_as_the_handoff_did_before_it_is_measured_and_saved(self):
        self.put("a.pdf")
        raw = "a" * 200 + "\u00a0x\r\n\n\n\n" + "b" * 200 + "\n\n"
        e = self.run_tree(pdf=fake(raw))["a.pdf"]
        with open(os.path.join(self.out, "a.pdf.txt"), encoding="utf-8") as f:
            saved = f.read()
        self.assertEqual(saved, "a" * 200 + " x\n\n" + "b" * 200 + "\n")
        self.assertEqual(e["chars"], 404)

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
        self.assertEqual(e["pack/inner.docx"]["status"], "read")
        self.assertEqual(e["pack/evil.pdf"]["status"], "read")
        self.assertEqual(e["pack/EBVPD.zip"]["status"], "skipped")
        self.assertIn("nested zip", e["pack/EBVPD.zip"]["reason"])
        self.assertFalse(os.path.exists(os.path.join(self.tmp.name, "evil.pdf")))

    def test_nested_zip_reason_does_not_claim_it_is_an_ebvpd(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("Brėžiniai.zip", "x")
        self.put("pack.zip", buf.getvalue())
        e = self.run_tree()["pack/Brėžiniai.zip"]
        self.assertEqual((e["status"], e["reason"]), ("skipped", "nested zip, not unpacked"))

    def test_zip_member_text_is_named_as_the_hand_checked_keys_cite_it(self):
        # handoff-from-claude/readings/key/10377061.json quotes from
        # "10377247_Pirkimas Nr. 3__4 priedas. Kvalifikacijos reikalavimai.docx.txt",
        # the text of a document inside the zip "10377247_Pirkimas Nr. 3.zip".
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("4 priedas. Kvalifikacijos reikalavimai.docx", "x")
        self.put("10377247_Pirkimas Nr. 3.zip", buf.getvalue())
        e = self.run_tree()
        self.assertEqual(e["10377247_Pirkimas Nr. 3/4 priedas. Kvalifikacijos reikalavimai.docx"]["status"], "read")
        self.assertEqual(os.listdir(self.out),
                         ["10377247_Pirkimas Nr. 3__4 priedas. Kvalifikacijos reikalavimai.docx.txt"])

    def test_hostile_zip_members_are_skipped_with_a_reason_and_the_rest_still_read(self):
        long_extract = "n" * 300 + ".pdf"        # too long to unpack under any file system
        long_text = "m" * 245 + ".pdf"           # unpacks, but its text file name is too long
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
        for bad in ("pack/..", "pack/.", "pack/" + long_extract,
                    "pack/" + long_text, "pack/crc.pdf"):
            with self.subTest(bad=bad[:40]):
                self.assertEqual(e[bad]["status"], "skipped")
                self.assertTrue(e[bad]["reason"])
        docs = [x for x in entries if x["file"].endswith("doc.pdf")]
        self.assertEqual([x["status"] for x in docs], ["read", "read"])
        self.assertEqual(len({x["file"] for x in docs}), 2)
        self.assertEqual(e["pack/inner.docx"]["status"], "read")
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


TOOLS = (shutil.which("soffice") and shutil.which("pdftotext")
         and importlib.util.find_spec("docx") and importlib.util.find_spec("openpyxl"))
MARKER = "Tiekėjas turi ISO 9001 standartą"


@unittest.skipUnless(TOOLS, "needs the reader image: LibreOffice, pdftotext, python-docx, openpyxl")
class RealConverters(unittest.TestCase):
    """The real converters on files made here: each format the ticket names is read."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.src = os.path.join(self.tmp.name, "docs")
        self.out = os.path.join(self.tmp.name, "text")
        self.work = os.path.join(self.tmp.name, "work")
        os.makedirs(self.src)
        os.makedirs(self.work)

    def tearDown(self):
        self.tmp.cleanup()

    def soffice(self, path, fmt, name):
        subprocess.run(["soffice", "--headless", "--norestore",
                        "-env:UserInstallation=file://" + os.path.join(self.tmp.name, "profile"),
                        "--convert-to", fmt, "--outdir", self.work, path],
                       capture_output=True, timeout=240, stdin=subprocess.DEVNULL)
        made = os.path.join(self.work, os.path.splitext(os.path.basename(path))[0] + "." + fmt)
        shutil.move(made, os.path.join(self.src, name))

    def test_word_pdf_excel_legacy_doc_xls_and_zip_are_read(self):
        import docx
        import openpyxl
        word = os.path.join(self.work, "w.docx")
        d = docx.Document()
        for _ in range(6):
            d.add_paragraph(MARKER)
        d.save(word)
        sheet = os.path.join(self.work, "s.xlsx")
        wb = openpyxl.Workbook()
        for i in range(6):
            wb.active.append([MARKER, i])
        wb.save(sheet)

        shutil.copy(word, os.path.join(self.src, "a.docx"))
        self.soffice(word, "doc", "b.doc")
        self.soffice(word, "pdf", "c.pdf")
        shutil.copy(sheet, os.path.join(self.src, "d.xlsx"))
        self.soffice(sheet, "xls", "e.xls")
        with zipfile.ZipFile(os.path.join(self.src, "f.zip"), "w") as z:
            z.write(word, "vidinis.docx")
            z.writestr("EBVPD.zip", b"PK")

        e = {x["file"]: x for x in ct.convert_tree(self.src, self.out)}

        for name in ("a.docx", "b.doc", "c.pdf", "d.xlsx", "e.xls", "f/vidinis.docx"):
            with self.subTest(name=name):
                self.assertEqual(e[name]["status"], "read", e[name]["reason"])
                with open(os.path.join(self.out, name.replace("/", "__") + ".txt"), encoding="utf-8") as f:
                    self.assertIn(MARKER, f.read())
        self.assertEqual(e["f/EBVPD.zip"]["status"], "skipped")


if __name__ == "__main__":
    unittest.main()
