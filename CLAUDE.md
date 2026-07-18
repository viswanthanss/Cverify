# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs available at `http://localhost:8000/docs`.

### Frontend (Angular 17)
```bash
cd frontend-angular
npm install --legacy-peer-deps   # --legacy-peer-deps is required
npx ng serve --port 4200
```

### Docker (recommended for full stack)
```bash
# Development — exposes ports directly, mounts local models
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production — Traefik reverse proxy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Dev URLs: Angular at `:8080`, FastAPI at `:8000`, n8n at `:5678`.

### Retrain ML models
```bash
cd backend
python scripts/train_models.py
```

## Architecture

### ML Pipeline (3 model groups → 6 `.pkl` files)
All models live in `backend/models/` and are loaded at request time via `ModelBundle` in [backend/app/predictor.py](backend/app/predictor.py).

1. **Candidate evaluation** (`classifier_hire.pkl`, `salary_predictor.pkl`, `kmeans_clusters.pkl`, `label_encoder.pkl`) — Random Forest + XGBoost + KMeans trained on `backend/data/AI_Resume_Screening.csv`.
2. **NLP role classifier** (`job_role_classifier.pkl`) — TF-IDF + Random Forest for 24-category job role prediction, called inside `parse_cv_pdf()`.
3. **Job recommender** (`job_recommender_v2.pkl`) — TF-IDF cosine + Jaccard hybrid against 20 k+ postings. `recommend_jobs_v2()` is tried first; `recommend_jobs()` (v1, category-based) is the fallback.

The main prediction flow: `POST /cvs/upload-pdf/full` → [pdf_parser.py](backend/app/pdf_parser.py) extracts text & structured fields → [feature_builder.py](backend/app/feature_builder.py) engineers features → `predict()` in [main.py](backend/app/main.py) runs the three model groups → [recommendation.py](backend/app/recommendation.py) generates a text recommendation → saved to DB.

### Backend (FastAPI + SQLAlchemy)
All routes are in a single file: [backend/app/main.py](backend/app/main.py). There is no router split — adding endpoints means adding them directly there.

- **DB schema**: defined in [backend/app/models.py](backend/app/models.py). New columns are applied via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in the `on_startup` handler (no migration framework).
- **Auth**: JWT HS256 via `get_current_user` / `require_role(*roles)` FastAPI dependencies in [backend/app/auth.py](backend/app/auth.py). Token stored as `Authorization: Bearer`. Roles: `candidate`, `recruiter`, `admin`.
- **Job data sources**: three sources coexist in the `jobs` table (`source` column: `dataset` | `scraper` | `recruiter`). On startup, jobs are seeded with priority: Azure SQL DW → `seed_jobs.py` (80 demo jobs) → `data_jobs.csv` (40 k rows).

### Frontend (Angular 17)
- All routes are **lazy-loaded standalone components** — defined in [frontend-angular/src/app/app.routes.ts](frontend-angular/src/app/app.routes.ts).
- **Auth state** is managed with Angular Signals in [frontend-angular/src/app/core/auth.service.ts](frontend-angular/src/app/core/auth.service.ts). JWT + user object are persisted in `localStorage` under keys `cverify_token` / `cverify_user`.
- **API calls** are centralised in [frontend-angular/src/app/core/api.service.ts](frontend-angular/src/app/core/api.service.ts). The base URL comes from `environment.apiUrl`.
- **Toast notifications** use [frontend-angular/src/app/core/toast.service.ts](frontend-angular/src/app/core/toast.service.ts).
- The n8n chatbot is a floating widget injected from [frontend-angular/src/app/shared/](frontend-angular/src/app/shared/).

### Infrastructure
- **CI/CD**: GitLab CI ([.gitlab-ci.yml](.gitlab-ci.yml)). Three stages: `models` (download `.pkl` from Kaggle), `build` (Docker images pushed to Docker Hub), `deploy` (shell runner on a Kali VM executes `deploy.sh`).
- **n8n** handles the AI chatbot at `/webhook/chatbot` and is orchestrated alongside the backend in Docker Compose.
- **Azure SQL** (`Jobs_DW` database): configured via `AZURE_SQL_*` env vars. The integration module is [backend/app/azure_jobs.py](backend/app/azure_jobs.py). Azure import runs automatically on startup if configured.

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL DSN (default targets the `db` Docker service) |
| `JWT_SECRET` | Must be changed in production |
| `AZURE_SQL_SERVER/DB/USER/PASSWORD` | Optional Azure SQL DW source |
| `AZURE_SQL_IMPORT_LIMIT` | Max rows imported from Azure on startup (0 = all) |
| `N8N_WEBHOOK_URL` | n8n chatbot endpoint |

## Notifications System
When a candidate applies, two `Notification` rows are created: one for the recruiter (`application_received`) and one for the candidate (`application_confirmed`). When a recruiter accepts/rejects via `PATCH /applications/{id}/status`, a third notification is sent to the candidate with meeting details (slots, link, location, contact) stored as JSON in `meeting_slots` and individual columns on `job_applications`.
