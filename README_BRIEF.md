# CVerify — AI-Powered CV Screening & Job Recommendation Platform

## Project Overview

**CVerify** is an intelligent recruitment platform that uses machine learning to evaluate CVs and match candidates with relevant job opportunities. It combines a production-ready backend API with a modern web interface to streamline the hiring process.

### What It Does

- **Analyzes CVs** using 6 trained ML models to predict hiring likelihood and salary ranges
- **Classifies job roles** from CV content using NLP (24 job categories)
- **Recommends jobs** by matching candidates against 20,000+ real job postings
- **Manages recruitment workflows** with recruiter dashboards, candidate profiles, and application tracking
- **Provides notifications** for job matches, application status updates, and meeting scheduling
- **Includes an AI chatbot** powered by n8n for user engagement

---

## 🌐 Live Website & Presentations

**Visit the application here:** [https://cverify-frontend.onrender.com](https://cverify-frontend.onrender.com)

**Backend API:** [https://cverify-backend.onrender.com](https://cverify-backend.onrender.com)

### 📊 Canva Presentations

- **Presentation 1:** [https://canva.link/dnsvotohnszm12h](https://canva.link/dnsvotohnszm12h)
- **Presentation 2:** [https://canva.link/4zpdu0yeot7kica](https://canva.link/4zpdu0yeot7kica)

---

## Key Features

✅ **Intelligent CV Parsing** — Extracts structured data from PDF resumes  
✅ **ML-Based Scoring** — Random Forest + XGBoost models for candidate evaluation  
✅ **Smart Job Matching** — TF-IDF + Jaccard similarity for 20k+ job recommendations  
✅ **Role-Based Dashboards** — Separate interfaces for candidates, recruiters, and admins  
✅ **Power BI Analytics** — Embedded analytics for recruitment insights  
✅ **Real-Time Notifications** — Application updates and meeting scheduling  
✅ **Secure Authentication** — JWT-based user authentication with role management  
✅ **Fully Dockerized** — One-command deployment for dev and production  

---

## Tech Stack

### Backend
- **FastAPI** — High-performance Python web framework
- **PostgreSQL** — Relational database (with Azure SQL DW integration)
- **scikit-learn, XGBoost** — ML models for predictions
- **SQLAlchemy** — ORM for database operations
- **JWT** — Secure authentication

### Frontend
- **Angular 17** — Modern web application framework
- **Bootstrap / TailwindCSS** — Responsive UI components
- **Angular Signals** — Efficient state management
- **HttpClient** — Centralized API communication

### Infrastructure
- **Docker & Docker Compose** — Containerization and orchestration
- **Traefik** — Reverse proxy and load balancer (production)
- **Render** — Cloud hosting platform
- **n8n** — Workflow automation and chatbot
- **GitLab CI** — Continuous integration and deployment

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone <repository-url>
cd project-cv-ml-fr-main

# Copy environment configuration
cp .env.example .env

# Start all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Access the app:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Option 2: Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend-angular
npm install --legacy-peer-deps
npx ng serve --port 4200
```

---

## Project Architecture

### ML Pipeline Flow

```
User uploads CV (PDF)
        ↓
PDF Parser (pdfplumber, Tesseract OCR)
        ↓
Feature Engineering (NLP, text extraction)
        ↓
ML Model Predictions (3 models in parallel):
  • Hiring Classifier → Likelihood score
  • Salary Predictor → Estimated salary
  • Job Role Classifier → 24-category classification
        ↓
Job Recommender
  → Matches against 20,414 job postings
  → Returns top matching jobs
        ↓
Store Results & Send Notifications
        ↓
Display on Dashboard
```

### Core Models (6 Trained Models)

1. **Hiring Classifier** (`classifier_hire.pkl`)
   - Predicts: Hire/Reject decision
   - Accuracy: 100% | Training data: 1000+ resumes

2. **Salary Predictor** (`salary_predictor.pkl`)
   - Predicts: Estimated salary range
   - MAE: $21,106

3. **Clustering** (`kmeans_clusters.pkl`, `label_encoder.pkl`)
   - Groups candidates into segments

4. **Job Role Classifier** (`job_role_classifier.pkl`)
   - Classifies CV into 24 job categories
   - F1-weighted: 75.5%
   - Uses TF-IDF + Random Forest

5. **Job Recommender** (`job_recommender_v2.pkl`)
   - Hybrid: TF-IDF Cosine + Jaccard Skills similarity
   - Matches candidates to 20,414 real jobs
   - Grid-optimized for Hit@5 and MRR metrics

### API Endpoints (Sample)

```
POST   /auth/register                    Register new user
POST   /auth/login                       Get JWT token
POST   /cvs/upload-pdf/full              Upload CV, get predictions
GET    /cvs/{id}/recommendations         Get job recommendations
GET    /jobs                             List available jobs
POST   /applications                     Apply for a job
PATCH  /applications/{id}/status         Update application status (recruiter)
GET    /admin/stats                      Analytics dashboard
```

---

## System Requirements

- **Node.js** 18+ (for Angular)
- **Python** 3.9+ (for FastAPI)
- **Docker** & **Docker Compose** (recommended)
- **PostgreSQL** (or use Docker service)

---

## Database Schema

Core tables:
- **users** — Candidates, recruiters, admins with JWT tokens
- **cvs** — Uploaded CV data with ML predictions
- **jobs** — Job postings from multiple sources (Azure SQL, CSV, seed data)
- **job_applications** — Application history and status
- **notifications** — Real-time alerts for recruiters and candidates

Data is persisted in PostgreSQL with automatic schema migration on startup.

---

## Environment Variables

Create `.env` from `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@db:5432/cverify

# Security
JWT_SECRET=your-secret-key-here

# Optional: Azure SQL Data Warehouse
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DB=Jobs_DW
AZURE_SQL_USER=admin
AZURE_SQL_PASSWORD=password

# n8n Chatbot
N8N_WEBHOOK_URL=http://n8n:5678/webhook/chatbot
```

---

## Development Workflow

### Adding a New API Route

Edit `backend/app/main.py`:

```python
@app.post("/your-endpoint")
async def your_endpoint(data: YourSchema, current_user = Depends(get_current_user)):
    # Your logic here
    return {"result": "success"}
```

### Adding a New Frontend Page

1. Create component: `frontend-angular/src/app/pages/your-page/`
2. Register in `app.routes.ts`:

```typescript
{
  path: 'your-page',
  loadComponent: () => import('./pages/your-page/your-page.component').then(m => m.YourPageComponent)
}
```

### Retraining ML Models

```bash
cd backend
python scripts/train_models.py
```

Models are automatically reloaded on next API restart.

---

## Deployment

### Production with Docker

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Features:**
- Traefik reverse proxy with HTTPS
- Load balancing
- Automatic domain routing

### CI/CD Pipeline

GitLab CI handles:
1. Model download from Kaggle
2. Docker image build
3. Push to Docker Hub
4. Deploy to cloud (Render)

---

## User Roles

- **Candidate** — Upload CV, view recommendations, apply for jobs
- **Recruiter** — Review applications, schedule meetings, send notifications
- **Admin** — System statistics, seed jobs, manage users

---

## Support & Documentation

- **Full technical docs:** See `CLAUDE.md` in the repository
- **API docs:** Visit `/docs` endpoint on the backend
- **Issues:** Create a GitLab issue for bug reports
- **Questions:** Check the repository README for more details

---

## License

See LICENSE file for details.

---

**Built with ❤️ by the CVerify Team**  
*Powered by FastAPI, Angular 17, PostgreSQL, and Machine Learning*
