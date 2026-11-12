#!/usr/bin/env python3
"""Fetch one tender's notice page and documents from viesiejipirkimai.lt.

Adapted from handoff-from-claude/reader/fetch/fetch_tender.py: same URLs, same parsing,
one request every 2.2 seconds. Changes: the user agent identifies gaus and carries the
contact address from FETCHER_CONTACT, paths are arguments, and the log holds only
HTTP codes, sizes and file names.

Usage: python3 -I reader/fetch_tender.py TENDER_ID WORK_DIR DOCS_DIR
Exit codes: 0 documents fetched, 2 notice not served, 3 notice served but no documents.
"""
import html
import os
import re
import subprocess
import sys
import time

BASE = "https://viesiejipirkimai.lt"
DELAY = 2.2
MAX_TOTAL = 60 * 1024 * 1024
SKIP_EXT = re.compile(r"\.(dwg|dxf|dwf|rvt|ifc|mp4|mov|avi)$", re.I)
WRITE_OUT = "\n@@gaus-write-out@@"   # marks curl's status line on stderr
CURL_TOO_LARGE = 63                 # curl's exit code when --max-filesize stops a transfer


def user_agent(env):
    contact = (env.get("FETCHER_CONTACT") or "").strip()
    if not contact:
        sys.exit("FETCHER_CONTACT is not set")
    return "gaus-reader/0.1 (+tender documents for a supplier-facing reading tool; contact: %s)" % contact


def parse_documents(page_html):
    docs = []
    for tr in re.findall(r"<tr>(.*?)</tr>", page_html, re.S):
        for m in re.finditer(r"downloadDocForAnonymous\('(\d+)'\)\">(.*?)</a>", tr, re.S):
            docs.append((m.group(1), html.unescape(m.group(2)).strip()))
    return docs


class Fetcher:
    def __init__(self, ua, jar):
        self.ua, self.jar, self.last = ua, jar, 0.0

    def get(self, url, out, maxbytes=None):
        """Save url to out. Returns "http|bytes|type", "ERR ..." if curl failed, or "SKIP <reason>"
        if the body passed maxbytes; then out is deleted.

        curl's --max-filesize only refuses a body whose Content-Length is too big, so the body
        comes through a pipe and the bytes actually received are counted here as well."""
        wait = DELAY - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        cmd = ["curl", "-sS", "-m", "90", "-L", "-A", self.ua, "-c", self.jar, "-b", self.jar,
               "-w", "%{stderr}" + WRITE_OUT + "%{http_code}|%{size_download}|%{content_type}\n"]
        if maxbytes:
            cmd += ["--max-filesize", str(maxbytes)]
        cmd.append(url)
        try:
            f = open(out, "wb")
        except OSError as ex:  # e.g. a document name too long for the disk
            return "ERR cannot save the file (%s)" % type(ex).__name__
        received = 0
        with f, subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE) as p:
            for chunk in iter(lambda: p.stdout.read(65536), b""):
                received += len(chunk)
                if maxbytes and received > maxbytes:
                    p.kill()
                    break
                f.write(chunk)
            err = p.stderr.read().decode("utf-8", "replace")
        self.last = time.time()
        if maxbytes and (received > maxbytes or p.returncode == CURL_TOO_LARGE):
            os.remove(out)
            return "SKIP over the size cap (more than %d bytes)" % maxbytes
        before, _, after = err.partition(WRITE_OUT)
        if p.returncode != 0:
            return "ERR " + (before.strip() or "curl exit %d" % p.returncode)[:100]
        return after.strip()


def _read(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


def main(argv):
    tid, work, docs_dir = argv
    if not re.fullmatch(r"\d+", tid):
        sys.exit("tender id must be digits")
    ua = user_agent(os.environ)
    os.makedirs(work, exist_ok=True)
    os.makedirs(docs_dir, exist_ok=True)
    f = Fetcher(ua, os.path.join(work, "jar.txt"))

    notice = os.path.join(work, "notice.html")
    r = f.get("%s/epps/cft/prepareViewCfTWS.do?resourceId=%s" % (BASE, tid), notice)
    print("notice page: http|bytes|type =", r)
    page = _read(notice)
    served = r.startswith("200|") and "Pirkimo vykdytojo pavadinimas" in page
    print("notice page served with expected content:", served)
    if not served:
        return 2

    listing = os.path.join(work, "documents.html")
    r = f.get("%s/epps/cft/listContractDocuments.do?resourceId=%s" % (BASE, tid), listing)
    print("document list: http|bytes|type =", r)
    docs = parse_documents(_read(listing))
    print("documents listed:", len(docs))

    total, got = 0, 0
    for did, name in docs:
        if SKIP_EXT.search(name):
            print("not downloaded (CAD/video):", name)
            continue
        safe = re.sub(r"[^\w.\- ąčęėįšųūžĄČĘĖĮŠŲŪŽ()]", "_", name)
        out = os.path.join(docs_dir, "%s_%s" % (did, safe))
        r = f.get("%s/epps/cft/downloadContractDocument.do?documentId=%s&resourceId=%s" % (BASE, did, tid), out,
                  maxbytes=MAX_TOTAL - total if total < MAX_TOTAL else 1)
        if r.startswith("SKIP "):
            print("not downloaded (%s): %s" % (r[5:], name))
            continue
        size = os.path.getsize(out) if os.path.exists(out) else 0
        total += size
        ok = r.startswith("200|") and size > 0
        got += ok
        print("download: %s -> http|bytes|type = %s" % (name, r))
        if not ok and os.path.exists(out):
            os.remove(out)
    print("documents downloaded: %d of %d, %d bytes" % (got, len(docs), total))
    return 0 if got else 3


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
