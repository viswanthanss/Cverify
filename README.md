# CVerify — AI-Powered Recruitment Intelligence Platform

> **3 ML Notebooks → 6 Exported Models → Full-Stack Production App**
> Angular 17 · FastAPI · PostgreSQL · Docker · n8n · JWT Auth · Job Scraper · NLP

[![Pipeline](https://gitlab.com/AttiaImeed/cverify/badges/main/pipeline.svg)](https://gitlab.com/AttiaImeed/cverify/-/pipelines)
[![Backend](https://img.shields.io/docker/pulls/attiaimeed/cverify-backend?label=backend%20pulls&logo=docker)](https://hub.docker.com/r/attiaimeed/cverify-backend)
[![Frontend](https://img.shields.io/docker/pulls/attiaimeed/cverify-frontend?label=frontend%20pulls&logo=docker)](https://hub.docker.com/r/attiaimeed/cverify-frontend)

---

## Overview

CVerify is a production-ready AI recruitment platform that analyses CVs through a **3-phase ML pipeline**, recommends matching jobs from 20 000+ real job postings, and provides a full recruiter/candidate/admin web interface with an integrated AI chatbot.

---

## ML Architecture — 3 Notebooks → 6 Models

```
PDF Upload (pdfplumber + Tesseract OCR)
         │
         ├──► [NLP · Notebook 2]──────────────────────────────────────────────┐
         │     TF-IDF (15k tokens, bigrams) + Random Forest (300 trees)       │
         │     24-category job role classifier                                 │
         │     Output: job_role_classifier.pkl  (F1-weighted: 75.5%)           │
         │                                                                      │
         ├──► [Candidate Eval · Notebook 1]────────────────────────────────────┤
         │     Random Forest Classifier   → hire probability (Acc: 100%)       │
         │     XGBoost Regressor          → salary prediction (MAE: $21,106)   │
         │     KMeans (k=2)               → candidate cluster (Sil: 0.294)     │
         │     Outputs: classifier_hire.pkl · salary_predictor.pkl             │
         │              kmeans_clusters.pkl · label_encoder.pkl                │
         │                                                                      │
         └──► [Job Recommender · Notebook 3]────────────────────────────────────┘
               TF-IDF Cosine + Jaccard Skills + Hybrid Weighted (0.5/0.3/0.2)
               Matches CV against 20,414 real job postings
               Output: job_recommender_v2.pkl  (Hit@5 / MRR@5 grid-optimised)
                         │
                         ▼
               FastAPI Backend ──► PostgreSQL ──► Angular 17 SPA
```

### Model Comparison Table

| Notebook | Model | Task | Best Metric | Exported As |
|---|---|---|---|---|
| resume-ml-pj | Random Forest | Hire/Reject | Acc 100%, F1 100% | `classifier_hire.pkl` |
| resume-ml-pj | XGBoost Regressor | Salary ($) | MAE $21,106 | `salary_predictor.pkl` |
| resume-ml-pj | KMeans k=2 | Candidate Cluster | Silhouette 0.294 | `kmeans_clusters.pkl` |
| resume-ml-pj | LabelEncoder | Encode target | — | `label_encoder.pkl` |
| nlp-model-comparison | Random Forest (TF-IDF) | 24-cat NLP | F1-w 75.5% | `job_role_classifier.pkl` |
| job-recommender-model | TF-IDF Hybrid | Job Matching | Hit@5 (grid) | `job_recommender_v2.pkl` |

> NLP competitors tested: Logistic Regression (65.4%), Linear SVC (68.9%), Multinomial NB (51.2%)
> Regression competitors: Ridge (MAE $21,187), Lasso, RF Regressor

---

## Full Stack Architecture

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
│  Angular 17 SPA      │──►│  FastAPI Backend      │──►│  ML Models (.pkl)│
│  (Nginx reverse proxy)│  │  port 8000            │   │  backend/models/ │
│  port 8080           │   │  auth · jobs · CVs    │   │  6 files, ~53 MB │
│                      │   │  recommender · scraper│   └──────────────────┘
│  /             Home  │   └──────────┬───────────┘
│  /analyse      CV    │              │
│  /offres       Jobs  │   ┌──────────▼───────────┐   ┌──────────────────┐
│  /dashboard    Dash  │   │  PostgreSQL 16        │   │  n8n (AI chatbot)│
│  /candidat     Cand  │   │  users · jobs         │   │  port 5678       │
│  /recruteur    Recr  │   │  candidate_cvs        │   │  webhook /chatbot│
│  /admin        Admin │   │  recruiter_job_posts  │   └──────────────────┘
│  /showcase     ML    │   │  job_applications     │
└──────────────────────┘   │  scrape_logs          │
                           └──────────────────────┘
```

### Services

| Service | Image | Internal Port | Role |
|---|---|---|---|
| `db` | postgres:16-alpine | 5432 | PostgreSQL database |
| `backend` | attiaimeed/cverify-backend | 8000 | FastAPI + ML inference |
| `frontend` | attiaimeed/cverify-frontend | 80 | Angular 17 SPA + Nginx proxy |
| `n8n` | n8nio/n8n:latest | 5678 | AI chatbot & workflow automation |
| `traefik` *(prod only)* | traefik:v3.0 | 80 / 8090 | Reverse proxy + dashboard |

### Compose Files

| File | Purpose | Usage |
|---|---|---|
| `docker-compose.yml` | Base — shared config, healthchecks, volumes | base for all envs |
| `docker-compose.dev.yml` | Dev overrides — direct ports, models mount | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` |
| `docker-compose.prod.yml` | Prod overrides — Traefik, Docker Hub images | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` |

### Healthchecks

All 4 services have healthchecks configured. `depends_on: condition: service_healthy` ensures startup order:
```
db (pg_isready) → backend (GET /health) → frontend + n8n
```

---

## CI/CD Pipeline — GitLab

```
git push origin main
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Stage 1: models                                                        │
│    download-models                                                      │
│      • Install kaggle CLI                                               │
│      • Download outputs from 3 Kaggle kernels (KAGGLE_TOKEN env var)   │
│        - attiaimeed/resume-ml-pj        → classifier_hire.pkl, etc.    │
│        - attiaimeed/job-recommender-model → job_recommender_v2.pkl     │
│        - attiaimeed/nlp-model-comparison  → job_role_classifier.pkl    │
│      • Verify all required models present                               │
│      • Pass backend/models/ as artifact to next stage                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Stage 2: build  (parallel)                                             │
│    build-backend                        build-frontend                  │
│      • Receives models artifact           • No dependencies (parallel) │
│      • docker build ./backend             • docker build ./frontend    │
│        (models baked into image)          • push :SHA + :latest        │
│      • push :SHA + :latest                                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Stage 3: deploy  (Kali VM runner, tag: deploy)                        │
│    deploy                                                               │
│      • bash $CI_PROJECT_DIR/deploy.sh                                  │
│        - docker compose down (keeps volumes)                           │
│        - docker compose pull (new images from Docker Hub)              │
│        - docker compose up -d                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Required GitLab CI/CD Variables

| Variable | Description |
|---|---|
| `KAGGLE_TOKEN` | Kaggle API key (e.g. `KGAT_xxxxxxxxxxxxxxxx`) |
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (PAT) |
| `RENDER_BACKEND_HOOK` | Render deploy hook URL for backend (optional, for auto-redeploy) |
| `RENDER_FRONTEND_HOOK` | Render deploy hook URL for frontend (optional, for auto-redeploy) |

**Render Deploy Hooks:** After pushing to Docker Hub, the pipeline automatically triggers Render to pull the latest images via webhook URLs. Set these in GitLab → Settings → CI/CD → Variables (Masked).

### GitLab Runner (Kali VM)

```bash
# Register runner
sudo gitlab-runner register
# URL: https://gitlab.com
# Tag: deploy
# Executor: shell

# Allow runner to use Docker
sudo usermod -aG docker gitlab-runner
sudo gitlab-runner start
```

---

## Deploy Script (`deploy.sh`)

Placed in the repo root, called automatically by the CI deploy job:

```bash
./deploy.sh   # or: bash "$CI_PROJECT_DIR/deploy.sh"
```

Steps: stop containers → pull new images → start → wait for backend healthcheck → print live URLs.
Data volumes (`pgdata`, `n8n_data`) are **never deleted**.

---

## Quick Start

### Live Demo (Render)

🚀 **Now deployed on Render free tier:**

| URL | Description |
|---|---|
| https://cverify-frontend.onrender.com | Angular SPA (live demo) |
| https://cverify-backend.onrender.com | FastAPI backend |

**Note:** Free tier services spin down after 15 min of inactivity → ~30 sec cold start on first visit.

### Development (with hot ports)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| URL | Description |
|---|---|
| http://localhost:8080 | Angular SPA |
| http://localhost:8000/docs | FastAPI Swagger UI |
| http://localhost:5678 | n8n workflow editor |

### Production (Traefik reverse proxy)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

| URL | Description |
|---|---|
| http://your-host | Angular SPA (via Traefik) |
| http://your-host:8090 | Traefik dashboard |
| http://your-host:5678 | n8n admin UI |

### Local Development

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend-angular
npm install --legacy-peer-deps
npx ng serve --port 4200
```

---

## Angular Frontend — Pages & Routes

| Route | Component | Description |
|---|---|---|
| `/` | HomeComponent | Landing page with hero, stats, features |
| `/analyse` | AnalyseComponent | Upload CV → ML predictions (hire, salary, cluster, NLP role) |
| `/offres` | JobsComponent | Browse 20k+ jobs with search, filters, pagination |
| `/dashboard` | DashboardComponent | Candidate dashboard with prediction history |
| `/candidat` | CandidatePortalComponent | Candidate profile, applications, recommendations |
| `/recruteur` | RecruiterComponent | Recruiter panel — post jobs, manage applications |
| `/admin` | AdminComponent | Admin panel — KPIs, scraper, user management, logs |
| `/showcase` | ShowcaseComponent | ML pipeline showcase — models, datasets, architecture |

### Frontend Features

- **Standalone components** with lazy-loaded routes
- **Signals API** for reactive state management
- **n8n AI chatbot** floating widget on all pages
- **Responsive** with global footer and toast notifications
- **JWT auth** with role-based navigation (candidate / recruiter / admin)

---

## Project Structure

```
cverify/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI routes (auth · jobs · CVs · recruiter · admin)
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── db.py              # Database connection & session
│   │   ├── auth.py            # bcrypt + JWT auth (get_current_user, require_role)
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── pdf_parser.py      # PDF text extraction + NLP job role classification
│   │   ├── predictor.py       # ML prediction pipeline (hire · salary · cluster)
│   │   ├── job_recommender.py # Job recommendation engine (TF-IDF hybrid)
│   │   ├── feature_builder.py # Feature engineering for ML models
│   │   ├── recommendation.py  # Recommendation utilities
│   │   └── seed_data.py       # Seed users, recruiter posts, jobs on startup
│   ├── models/                # 6 exported .pkl model files (~53 MB)
│   ├── data/
│   │   ├── AI_Resume_Screening.csv  # 1,000 CVs training dataset
│   │   └── data_jobs.csv            # 20,414 real job postings
│   ├── scripts/
│   │   └── train_models.py    # Retrain classifier + regressor + clustering
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-ml.txt
│
├── frontend-angular/          # Angular 17 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Services (API, Auth, Toast), models, guards
│   │   │   ├── shared/        # ChatWidgetComponent (n8n chatbot)
│   │   │   ├── pages/         # All page components (lazy-loaded)
│   │   │   │   ├── home/
│   │   │   │   ├── analyse/
│   │   │   │   ├── jobs/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── candidate-portal/
│   │   │   │   ├── recruiter/
│   │   │   │   ├── admin/
│   │   │   │   └── showcase/
│   │   │   ├── app.component.ts   # Root component (nav, footer, router-outlet)
│   │   │   └── app.routes.ts      # Route definitions
│   │   └── styles.css         # Global styles
│   ├── nginx.conf             # Nginx reverse proxy config
│   ├── Dockerfile             # Multi-stage: Node build → Nginx serve
│   └── package.json
│
├── database/
│   └── init.sql               # PostgreSQL schema + seed data
│
├── scraper/
│   ├── job_scraper_final.py   # BeautifulSoup scraper (RemoteOK + Arbeitnow)
│   └── jobs_output_final.csv  # Scraped job results
│
├── n8n-workflows/
│   └── cverify-workflow.json  # n8n chatbot workflow configuration
│
├── scripts/                   # ML training notebooks
│   ├── resume-ml-pj.ipynb                               # Notebook 1: Hire + Salary + Clustering
│   ├── nlp-model-comparison-for-resume-job-role-classific.ipynb  # Notebook 2: 24-cat NLP
│   ├── job-recommender-model.ipynb                      # Notebook 3: Job recommendation
│   └── results/               # Exported model artifacts
│
├── docker-compose.yml
├── .gitlab-ci.yml
└── README.md
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register user (candidate/recruiter/admin) |
| POST | `/auth/login` | Login → JWT token |
| GET | `/auth/me` | Current user profile |

### CV Analysis
| Method | Path | Description |
|---|---|---|
| POST | `/cvs/upload-pdf/full` | Upload PDF → predict hire/salary/cluster + NLP role |
| POST | `/jobs/recommend` | Upload PDF → top-5 job recommendations (v2 model) |

### Jobs
| Method | Path | Description |
|---|---|---|
| GET | `/jobs` | List jobs (search · location · remote · pagination) |
| GET | `/jobs/{id}` | Job detail |
| GET | `/jobs/stats/summary` | Stats (total · remote · with salary) |

### Recruiter
| Method | Path | Description |
|---|---|---|
| POST | `/recruiter/posts` | Create job post |
| GET | `/recruiter/posts` | My job posts |
| GET | `/recruiter/posts/{id}/applications` | Applications for a post |

### Applications
| Method | Path | Description |
|---|---|---|
| POST | `/applications` | Apply to a recruiter post |
| GET | `/applications` | My applications |
| PUT | `/applications/{id}/status` | Update application status |

### Admin
| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard KPIs (CVs, hired, probability, salary) |
| POST | `/admin/scrape` | Trigger live job scraper |
| GET | `/admin/scrape-logs` | Scraper history |
| POST | `/admin/import-jobs-csv` | Import data_jobs.csv |
| POST | `/admin/import-scraper-output` | Import scraper CSV results |
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/{id}/role` | Update user role |
| DELETE | `/admin/users/{id}` | Deactivate user |
| GET | `/admin/companies` | List recruiters with post counts |

---

## Authentication & Roles

- **JWT** (HS256, 24h expiry) — token in `Authorization: Bearer` header
- **bcrypt** password hashing
- **Roles**: `candidate` · `recruiter` · `admin`

### Seeded Accounts

| Email | Role | Password |
|---|---|---|
| `admin@cverify.com` | admin | `admin123` |
| `imed.attia@esprit.tn` | admin | `Esprit2026!` |
| `khalil.chiha@esprit.tn` | recruiter | `Esprit2026!` |
| `zaineb.khlifi@esprit.tn` | candidate | `Esprit2026!` |
| `yessine.mnejja@esprit.tn` | candidate | `Esprit2026!` |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://cverify:cverify_secret@db:5432/cverify` | PostgreSQL connection |
| `JWT_SECRET` | `cverify-prod-change-this-secret-key` | JWT signing secret (**change in production**) |
| `JWT_EXPIRE_MINUTES` | `1440` | Token expiry (24h) |
| `N8N_WEBHOOK_URL` | `http://n8n:5678/webhook/chatbot` | n8n chatbot webhook |

---


