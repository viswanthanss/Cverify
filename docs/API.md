# CVerify — API Reference

Base URL (dev): `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs` (Swagger UI)

---

## Authentication

### POST /auth/register
Register a new user.

```json
// Request
{
  "email": "alice@example.com",
  "password": "secret123",
  "full_name": "Alice Martin",
  "role": "candidate",          // candidate | recruiter
  "company": "Acme Corp"        // required when role=recruiter
}

// Response 201
{
  "id": 42,
  "email": "alice@example.com",
  "full_name": "Alice Martin",
  "role": "candidate"
}
```

### POST /auth/login
```json
// Request
{ "email": "alice@example.com", "password": "secret123" }

// Response 200
{ "access_token": "eyJ...", "token_type": "bearer" }
```

### GET /auth/me
Returns the current user (requires Bearer token).

---

## CV Analysis

### POST /analyse
Upload a PDF CV for AI analysis.

```
Content-Type: multipart/form-data
Authorization: Bearer <token>

file=<pdf binary>
```

```json
// Response 200
{
  "full_name": "Alice Martin",
  "email": "alice@example.com",
  "education": "M.Sc",
  "job_role": "INFORMATION-TECHNOLOGY",
  "experience_years": 4.5,
  "projects_count": 8,
  "ai_score": 82.0,
  "skills": "Python, FastAPI, Docker, PostgreSQL",
  "certifications": "AWS Certified Developer",
  "hire_probability": 0.87,
  "predicted_salary": 65000.0,
  "candidate_cluster": 1,
  "recommendation": "Top priority — 87% match. Strong backend engineer.",
  "job_recommendations": [
    {
      "rank": 1,
      "title": "Senior Backend Engineer",
      "company_name": "Doctolib",
      "location": "Paris",
      "match_score": 0.94
    }
  ]
}
```

### GET /history
Returns the CV analysis history for the logged-in candidate.

---

## Jobs

### GET /jobs
```
GET /jobs?page=1&per_page=20&q=data+scientist&country=France&source=azure_dw
```

Query params:
| Param       | Type   | Description                                |
|-------------|--------|--------------------------------------------|
| `q`         | string | Full-text search on title + skills         |
| `country`   | string | Filter by country                          |
| `source`    | string | dataset \| scraper \| azure_dw \| seed     |
| `page`      | int    | Page number (default 1)                    |
| `per_page`  | int    | Results per page (max 100, default 20)     |

```json
// Response
[
  {
    "id": 1001,
    "title_short": "Data Scientist",
    "title": "Senior Data Scientist — NLP",
    "company_name": "Capgemini France",
    "location": "Paris",
    "country": "France",
    "schedule_type": "Full-time",
    "work_from_home": false,
    "salary_year_avg": 75000.0,
    "skills": "python, pytorch, nlp",
    "source": "azure_dw",
    "posted_date": "2024-03-15T00:00:00"
  }
]
```

### GET /jobs/stats/summary
Returns aggregate statistics for the dashboard KPIs.

```json
{
  "total_candidates": 312,
  "avg_hire_probability": 0.72,
  "avg_predicted_salary": 68500.0,
  "total_jobs": 46774,
  "jobs_by_source": { "dataset": 40826, "azure_dw": 5000, "seed": 80 }
}
```

---

## Candidate Portal

### GET /candidat/profile
Returns the logged-in candidate's profile and latest CV analysis.

### PUT /candidat/profile
Update candidate profile fields.

### POST /candidat/apply/{job_id}
Apply to a job posting.

### GET /candidat/applications
List all applications by the current candidate.

---

## Recruiter

### POST /recruteur/posts
Create a job posting (role=recruiter required).

```json
{
  "title": "Senior ML Engineer",
  "description": "We are looking for ...",
  "location": "Paris",
  "salary_range": "70k–90k€"
}
```

### GET /recruteur/posts
List all postings by the current recruiter.

### GET /recruteur/posts/{id}/applications
List candidates who applied to a specific posting.

---

## Admin

### GET /admin/stats
Aggregate stats across all candidates and jobs.

### GET /admin/users
List all users (admin only).

### DELETE /admin/users/{id}
Delete a user account.

### POST /admin/import-jobs-azure
Trigger a manual import from Azure SQL Jobs_DW.

```
POST /admin/import-jobs-azure?limit=10000&replace=false
Authorization: Bearer <admin-token>
```

| Param     | Default | Description                                   |
|-----------|---------|-----------------------------------------------|
| `limit`   | 5000    | Max rows to import (0 = all ~159 k)           |
| `replace` | false   | Delete existing azure_dw rows first           |

```json
// Response 201
{
  "message": "Imported 5000 jobs from Azure SQL (Jobs_DW).",
  "source": "azure_dw"
}
```

---

## Health

### GET /health
```json
{ "status": "ok" }
```

---

## Error format

All errors follow the FastAPI default:
```json
{ "detail": "Human-readable error message" }
```

Common HTTP codes:
| Code | Meaning                         |
|------|---------------------------------|
| 400  | Bad request / validation error  |
| 401  | Missing or invalid token        |
| 403  | Insufficient role               |
| 404  | Resource not found              |
| 422  | Request body schema violation   |
| 500  | Internal server / ML error      |
