"""Tests for the convert-and-report seam.
Run from the repo root: python3 -m unittest discover -s reader -p "test_convert_tender.py"
"""
import importlib.util
import io
import itertools
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


def distinct(n=500):
    """One converter for every format: n letters, different for each file, so no file is a
    duplicate of another and none is numeric-dense."""
    count = itertools.count()
    letters = str.maketrans("0123456789", "bcdefghijk")
    return lambda path: ("%06d" % next(count)).translate(letters) + "a" * (n - 6)


def stand_ins():
    conv = distinct()
    return {k: conv for k in ("docx", "doc", "pdf", "xlsx", "xls")}


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
        base = stand_ins()
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

        entries = ct.convert_tree(self.src, self.out, converters=stand_ins())
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

    def test_generic_espd_request_form_is_skipped_as_boilerplate_and_reported(self):
        # handoff cascade/convert.py BOILERPLATE_PATTERNS: the EBVPD/ESPD request form is the same
        # text in every tender (10384200 and 10397525 ship it as espd-request.pdf in a zip)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("espd-request.pdf", "x")
        self.put("10388084_espd-request (3).zip", buf.getvalue())
        self.put("Specialiosios sąlygos.docx")
        entries = ct.convert_tree(self.src, self.out, converters=stand_ins())
        e = {x["file"]: x for x in entries}

        espd = e["10388084_espd-request (3)/espd-request.pdf"]
        self.assertEqual((espd["status"], espd["reason"]), ("skipped", "generic ESPD request form (boilerplate)"))
        self.assertEqual(e["Specialiosios sąlygos.docx"]["status"], "read")
        self.assertEqual(os.listdir(self.out), ["Specialiosios sąlygos.docx.txt"])
        self.assertIn("10388084_espd-request (3)/espd-request.pdf  (generic ESPD request form (boilerplate))",
                      "\n".join(ct.report_lines(entries)))

    def test_price_lists_and_bills_of_quantities_are_skipped_by_name_with_the_word_that_matched(self):
        # handoff cascade/convert.py NAME_PATTERNS, matched after folding Lithuanian letters:
        # 10392051 ships "4 priedas  MAKSIMALŪS_ĮKAINIAI.xlsx", 10389181 a "Darbu_kiekiu_ziniarastis"
        for name in ("4 priedas  MAKSIMALŪS_ĮKAINIAI.xlsx", "Priedas_4_Darbu_kiekiu_ziniarastis.xlsx",
                     "Statybos sąmata.pdf", "Pasiūlymo forma.docx"):
            self.put(name)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("Kvalifikacijos reikalavimai.docx", "x")
        self.put("Pirkimo dokumentai su kainomis.zip", buf.getvalue())
        e = self.run_tree()

        self.assertEqual(e["4 priedas  MAKSIMALŪS_ĮKAINIAI.xlsx"]["reason"],
                         "price list / bill of quantities by name (kain)")
        self.assertEqual(e["Priedas_4_Darbu_kiekiu_ziniarastis.xlsx"]["reason"],
                         "price list / bill of quantities by name (ziniarast)")
        self.assertEqual(e["Statybos sąmata.pdf"]["reason"], "price list / bill of quantities by name (samat)")
        self.assertEqual(e["Pasiūlymo forma.docx"]["status"], "read")
        # only the file's own name counts: a zip named for prices does not drop what is inside it
        self.assertEqual(e["Pirkimo dokumentai su kainomis/Kvalifikacijos reikalavimai.docx"]["status"], "read")

    def test_text_that_is_mostly_digits_is_skipped_as_a_price_list_with_its_digit_share(self):
        # handoff cascade/convert.py DIGIT_DENSITY_MAX: over 30 % digits among non-space characters
        self.put("a.xlsx")
        self.put("b.docx")
        texts = {"xlsx": fake("1 234,56 EUR\n" * 50),               # 6 digits of 10 characters
                 "docx": fake("Tiekėjas turi 3 metų patirtį.\n" * 30)}  # 1 digit of 25
        e = self.run_tree(**texts)

        self.assertEqual((e["a.xlsx"]["status"], e["a.xlsx"]["reason"]),
                         ("skipped", "numeric-dense (0.60) price list / quantities"))
        self.assertEqual(e["b.docx"]["status"], "read")
        self.assertEqual(os.listdir(self.out), ["b.docx.txt"])

    def test_a_second_copy_of_the_same_text_is_skipped_as_a_duplicate_of_the_first(self):
        # handoff cascade/convert.py: same text after whitespace is normalised, kept once
        self.put("a.docx")
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("a kopija.pdf", "x")
        self.put("pack.zip", buf.getvalue())
        e = self.run_tree(docx=fake("Tiekėjas turi ISO 9001.\n" * 20),
                          pdf=fake("Tiekėjas  turi ISO 9001. " * 20))

        self.assertEqual(e["a.docx"]["status"], "read")
        self.assertEqual((e["pack/a kopija.pdf"]["status"], e["pack/a kopija.pdf"]["reason"]),
                         ("skipped", "duplicate of a.docx"))
        self.assertEqual(os.listdir(self.out), ["a.docx.txt"])

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
        # words around the phone number, so the text is not numeric-dense and is read
        e = self.run_tree(docx=fake("SECRET Jonas +37060000000 kontaktinis asmuo pirkimo " * 30))
        lines = "\n".join(ct.report_lines(list(e.values())))
        self.assertIn("a.docx", lines)
        self.assertIn("read", lines)
        self.assertIn("1559 chars", lines)
        for blob in (lines, json.dumps(e)):
            self.assertNotIn("SECRET", blob)
            self.assertNotIn("37060000000", blob)


HERE = os.path.dirname(os.path.abspath(__file__))
REAL_TEXT = os.environ.get("GAUS_TENDER_TEXT_DIR",
                           os.path.join(HERE, "..", "handoff-from-claude", "readings", "text"))
KEYS = os.path.join(HERE, "..", "handoff-from-claude", "readings", "key")
# The one file a key cites that is the hand-checker's own working copy, not a tender document.
CITED_NOT_A_TENDER_FILE = {("10384200", "key_work/10384200/contract_raw.txt")}


def _key_cites(tid):
    with open(os.path.join(KEYS, tid + ".json"), encoding="utf-8") as f:
        key = json.load(f)
    found = set()

    def walk(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if k == "file" and isinstance(v, str):
                    found.add(v)
                else:
                    walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)
    walk(key)
    return found


def _as_text(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


@unittest.skipUnless(os.path.isdir(REAL_TEXT), "real tender texts not present")
class SkipRulesOnRealTenders(unittest.TestCase):
    """The skip rules on the 15 hand-checked tenders: each converted text is put back under its
    document's name (zip members into their zip) and converted as itself, so the rules see the
    real names and the real text. No document text is printed."""

    def test_no_file_a_hand_checked_key_cites_is_skipped(self):
        checked, absent = 0, set()
        for tid in sorted(f[:-5] for f in os.listdir(KEYS) if f.endswith(".json")):
            tdir = os.path.join(REAL_TEXT, tid)
            names = [n for n in os.listdir(tdir) if n.endswith(".txt") and os.path.isfile(os.path.join(tdir, n))]
            with tempfile.TemporaryDirectory() as tmp:
                src, out = os.path.join(tmp, "docs"), os.path.join(tmp, "text")
                os.makedirs(src)
                zips = {}
                for n in names:
                    doc = n[:-4]
                    if "__" in doc:  # a zip member: "<zip name>__<member>"
                        folder, member = doc.split("__", 1)
                        zips.setdefault(folder, []).append((member, os.path.join(tdir, n)))
                    else:
                        shutil.copy(os.path.join(tdir, n), os.path.join(src, doc))
                for folder, members in zips.items():
                    with zipfile.ZipFile(os.path.join(src, folder + ".zip"), "w") as z:
                        for member, path in members:
                            z.write(path, member)
                conv = {k: _as_text for k in ("docx", "doc", "pdf", "xlsx", "xls")}
                entries = ct.convert_tree(src, out, converters=conv)
            by_text = {e["file"].replace("/", "__") + ".txt": e for e in entries}
            for cited in sorted(_key_cites(tid)):
                if cited not in by_text:
                    absent.add((tid, cited))
                    continue
                e = by_text[cited]
                with self.subTest(tender=tid, file=cited):
                    self.assertEqual((e["status"], e["reason"]), ("read", None))
                checked += 1
        self.assertEqual(absent, CITED_NOT_A_TENDER_FILE)
        self.assertGreater(checked, 30)


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
