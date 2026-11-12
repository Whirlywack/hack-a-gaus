# The reader is a Python job outside the app, run on a GitHub runner in a prebuilt image

The reader fetches a tender's documents, converts them to text and has a model read them. Converting needs LibreOffice (legacy `.doc`, `.xls`) and `pdftotext`, which Vercel's functions do not have, so the reader is a Python job outside the app. It runs as a GitHub Actions job inside a container image that already holds LibreOffice, `pdftotext`, `python-docx` and `openpyxl` (`reader/Dockerfile`, published to `ghcr.io/whirlywack/gaus-reader`). A run installs nothing. The fetch and convert scripts stay tested against the 15 hand-checked keys, so the Reading record is unchanged from the handoff's schema.

## Evidence

Run 43300450996 (12 November 2026, `ubuntu-latest`, started for tender 10383512):

- The portal (viesiejipirkimai.lt) served the notice page and the document list to GitHub's network with no login redirect, and all 7 documents downloaded (1,926,397 bytes), 2.2 seconds apart. The fetch took about 26 seconds.
- Conversion took under 1 second: 5 files read (52,274, 136,509, 35,980, 42,318 and 3,275 characters), 2 skipped (a scanned PDF with no text, and the notice's XML).
- LibreOffice 7.4.7 and `pdftotext` 22.12.0 were present on the image. The image build took 1 min 34 s and is rebuilt only when the Dockerfile changes.
- The fetcher's contact address came from the secret `FETCHER_CONTACT`, never appeared in the log, and is not in the repo.
- The log and the uploaded report hold file names, character counts and skip reasons only.

## Not yet shown

- This tender has no `.doc`, `.xls` or zip files, so those paths are covered by unit tests with stand-in converters and not yet by a live run. The first tender that has them will show it.
- One run from one night is a single sample. The portal may rate-limit or block GitHub's address ranges later. If it does, the same image and scripts move to a small EU server without change.

## Consequences

- No EU server is needed now. The reader's later tickets can start the job from the app through a workflow dispatch.
- Runner addresses are shared and can change, so each read must report a portal refusal as a failed read, never as an empty Reading.
