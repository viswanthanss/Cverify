# CVerify — Architecture Overview

## System at a Glance

CVerify is a full-stack AI-powered CV screening and job-matching platform.
It runs as four Docker services orchestrated by Docker Compose.

```
Browser
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│  nginx:80  (Angular 17 SPA — static files)                      │
│  Routes /api/* → backend:8000                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (Docker network)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI :8000  (Python 3.11)                                   │
│  ├── Auth (JWT HS256 + bcrypt)                                  │
│  ├── CV Analysis  (pdfplumber → ML pipeline)                    │
│  ├── Job Recommender (TF-IDF hybrid, v2)                        │
│  ├── Jobs CRUD  (/jobs, /offres)                                │
│  └── Admin endpoints (/admin/*)                                 │
└──────────┬────────────────────────┬────────────────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────┐    ┌──────────────────────────────────────┐
│  PostgreSQL :5432│    │  n8n :5678 (5679 on host)            │
│  (pgdata volume) │    │  AI chatbot webhook → FastAPI        │
│  6 tables        │    └──────────────────────────────────────┘
└──────────────────┘

External (optional):
  Azure SQL cverify.database.windows.net → imported into jobs table at startup
```

---

## Services

| Service   | Image                             | Port (host) | Role                      |
|-----------|-----------------------------------|-------------|---------------------------|
| frontend  | attiaimeed/cverify-frontend:latest | 8080        | Angular SPA + nginx proxy |
| backend   | attiaimeed/cverify-backend:latest  | 8000        | FastAPI + ML models       |
| db        | postgres:16-alpine                | 5432        | Persistent data store     |
| n8n       | n8io/n8n:latest                   | 5679        | AI chatbot automation     |

---

## Data Flow — CV Analysis

```
User uploads PDF
    │
    ▼
pdf_parser.py
  ├── pdfplumber  (native PDF text)
  └── Tesseract OCR (scanned/image PDFs)
    │
    ▼
feature_builder.py
  Builds a pandas DataFrame row with:
  education_level, experience_years, projects_count,
  ai_score, skill_count, total_work_score, has_certification, job_role
    │
    ▼
predictor.py (ModelBundle)
  ├── XGBoost Classifier  → hire_probability  (0–1)
  ├── Linear Regressor    → predicted_salary  (€/year)
  └── KMeans Clustering   → candidate_cluster (0–3)
    │
    ▼
job_recommender.py
  TF-IDF cosine similarity over 40 k+ job descriptions
  Returns top-10 matched positions
    │
    ▼
recommendation.py
  Generates natural-language recommendation text
    │
    ▼
Response JSON → Angular cv-form component
```

---

## Database Schema

```sql
users             — authentication, roles (candidate | recruiter | admin)
candidate_cvs     — CV analysis results (one per upload)
jobs              — job offers (source: dataset | scraper | azure_dw | seed)
job_applications  — candidate ↔ job many-to-many
recruiter_job_posts — job postings created by recruiters
scrape_logs       — history of job-scraper runs
```

---

## Job Data Sources (priority order at startup)

| Priority | Source       | Rows    | Trigger                          |
|----------|-------------|---------|----------------------------------|
| 1        | Azure SQL   | 5 k–159 k | `AZURE_SQL_*` env vars set      |
| 2        | seed_jobs.py | 80      | Always present (demo fallback)   |
| 3        | data_jobs.csv | 40 826 | Heavy fallback (bundled in image)|
| Admin    | POST /admin/import-jobs-azure | variable | Manual trigger |

---

## ML Models

| File                        | Algorithm          | Task                   | Input features           |
|-----------------------------|--------------------|------------------------|--------------------------|
| hire_classifier.pkl         | XGBoost            | Hired vs Not Hired     | 8 engineered features    |
| salary_predictor.pkl        | Linear Regression  | Annual salary (€)      | Same 8 features          |
| kmeans_bundle.pkl           | KMeans (k=4)       | Candidate clustering   | Preprocessed subset      |
| job_role_classifier.pkl     | NLP / TF-IDF       | 24-category role label | CV raw text              |
| job_recommender_v2.pkl      | TF-IDF + cosine    | Top-10 job matches     | Skills + role text       |

All models trained in `scripts/` Jupyter notebooks and exported as `.pkl` via joblib.

---

## Authentication

- JWT (HS256), 24-hour expiry, secret in `JWT_SECRET` env var
- Roles: `candidate`, `recruiter`, `admin`
- Guards: Angular `authGuard` / `recruiterGuard` / `adminGuard`
- Login redirects: `/login?redirect=<original-url>`

---

## Environment Variables

| Variable               | Default              | Description                      |
|------------------------|----------------------|----------------------------------|
| `DATABASE_URL`         | (required)           | PostgreSQL connection string      |
| `JWT_SECRET`           | `cverify-change-me`  | JWT signing key                   |
| `JWT_EXPIRE_MINUTES`   | `1440`               | Token TTL (24 h)                  |
| `AZURE_SQL_SERVER`     | —                    | Azure SQL FQDN                   |
| `AZURE_SQL_DB`         | —                    | Database name (Jobs_DW)          |
| `AZURE_SQL_USER`       | —                    | SQL login                        |
| `AZURE_SQL_PASSWORD`   | —                    | SQL password (never commit)      |
| `AZURE_SQL_PORT`       | `1433`               | SQL Server port                  |
| `AZURE_SQL_IMPORT_LIMIT` | `5000`             | Max rows imported at startup     |
| `N8N_WEBHOOK_URL`      | `http://n8n:5678/...`| n8n chatbot endpoint             |

---

## Compose Files

| File                    | Purpose                                   |
|-------------------------|-------------------------------------------|
| `docker-compose.yml`    | Shared base (service definitions, volumes)|
| `docker-compose.dev.yml`| Dev overrides (volume mounts, hot reload) |
| `docker-compose.prod.yml`| Production (Traefik labels, TLS)         |

```bash
# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
