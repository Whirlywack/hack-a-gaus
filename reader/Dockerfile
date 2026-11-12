# The reader's image: LibreOffice and pdftotext are installed once here, not on every run.
FROM python:3.12-slim-bookworm
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl poppler-utils libreoffice-writer libreoffice-calc fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir python-docx==1.1.2 openpyxl==3.1.5
