FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-fra \
    tesseract-ocr-ara \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PIP_DEFAULT_TIMEOUT=120
COPY requirements.txt /app/requirements.txt
COPY requirements-ml.txt /app/requirements-ml.txt
RUN pip install --no-cache-dir --retries 5 --default-timeout=120 -r /app/requirements.txt \
    && pip install --no-cache-dir --retries 5 --default-timeout=120 --no-deps -r /app/requirements-ml.txt

COPY app /app/app
COPY data /app/data
COPY scripts /app/scripts
COPY models /app/models

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]