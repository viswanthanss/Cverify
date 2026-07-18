# CVerify — Azure SQL Integration

## Overview

CVerify connects to an Azure SQL data warehouse (`Jobs_DW`) hosted on
`cverify.database.windows.net` to import real job postings at startup.

The DW uses a **star schema** in the `dw` schema:

```
FACT_JOB_POSTING ──┬── DIM_JOB       (title, schedule_type)
                   ├── DIM_COMPANY   (company_name)
                   ├── DIM_LOCATION  (location, country)
                   ├── DIM_VIA       (job board channel)
                   └── DIM_DATE      (posted_date)

FACT_JOB_SKILL ────── DIM_SKILL      (aggregated via STRING_AGG)
```

Total rows: ~158 999 job postings.

> **Note:** The `dbo.stg_jobmatch_raw` staging table is intentionally **not used**
> — it is a mis-parsed raw CSV dump with shifted columns.

---

## Infrastructure

| Setting       | Value                                |
|---------------|--------------------------------------|
| Server        | `cverify.database.windows.net`       |
| Database      | `Jobs_DW`                            |
| Pricing tier  | Standard S0 — 10 DTUs               |
| Region        | West US 3                            |
| Subscription  | Azure for Students                   |
| Resource group| `cverify`                            |

---

## Configuration

Set these environment variables in `.env` (gitignored — never commit):

```bash
AZURE_SQL_SERVER=cverify.database.windows.net
AZURE_SQL_DB=Jobs_DW
AZURE_SQL_USER=cverify_test
AZURE_SQL_PASSWORD=<your-password>
AZURE_SQL_PORT=1433
AZURE_SQL_IMPORT_LIMIT=5000   # 0 = all ~159 k rows
```

The `.env.example` file ships with placeholders — copy it and fill in real values:
```bash
cp .env.example .env
```

---

## Driver Stack

```
Python → SQLAlchemy (mssql+pymssql) → pymssql → FreeTDS → Azure SQL
```

`pymssql>=2.3.0` is declared in `backend/requirements.txt`.
The connection URL is built with `sqlalchemy.engine.URL.create()` so special
characters in the password (e.g. `+`) are handled without manual URL-encoding.

---

## The Import Query

Located in `backend/app/azure_jobs.py` as `_DW_QUERY`:

```sql
SELECT TOP (5000)       -- omitted when limit=None/0
    j.job_title_short   AS title_short,
    j.job_title         AS title,
    j.job_schedule_type AS schedule_type,
    l.job_location      AS location,
    l.job_country       AS country,
    v.job_via           AS via,
    d.full_date         AS posted_date,
    f.work_from_home_flag    AS wfh,
    f.no_degree_mention_flag AS no_degree,
    f.health_insurance_flag  AS health,
    f.salary_rate, f.salary_year_avg, f.salary_hour_avg,
    c.company_name,
    STRING_AGG(s.skill_name, ', ') AS skills
FROM dw.FACT_JOB_POSTING f
LEFT JOIN dw.DIM_JOB      j  ON f.job_id      = j.job_id
LEFT JOIN dw.DIM_COMPANY  c  ON f.company_id  = c.company_id
LEFT JOIN dw.DIM_LOCATION l  ON f.location_id = l.location_id
LEFT JOIN dw.DIM_VIA      v  ON f.via_id      = v.via_id
LEFT JOIN dw.DIM_DATE     d  ON f.date_id     = d.date_id
LEFT JOIN (
    SELECT fs.job_id, STRING_AGG(CAST(s.skill_name AS NVARCHAR(MAX)), ', ') AS skills
    FROM dw.FACT_JOB_SKILL fs JOIN dw.DIM_SKILL s ON fs.skill_id = s.skill_id
    GROUP BY fs.job_id
) sk ON sk.job_id = f.job_id
ORDER BY f.posting_id
```

---

## Startup Behaviour

On every container start, `on_startup()` in `main.py` checks whether the
`jobs` table is empty, then:

```
jobs table empty?
 ├── YES → Azure configured?
 │         ├── YES → import_azure_jobs(limit)   source='azure_dw'
 │         │         if fails → seed_jobs.py    source='seed'
 │         └── NO  → seed_jobs.py (80 demo jobs) source='seed'
 │                   if fails → data_jobs.csv   source='dataset'
 └── NO  → skip (table already populated)
```

After the first import, subsequent restarts skip the import entirely.

---

## Manual Re-import (Admin)

```bash
# Get an admin token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cverify.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Import 10 000 rows (adds to existing azure_dw rows)
curl -X POST "http://localhost:8000/admin/import-jobs-azure?limit=10000&replace=false" \
  -H "Authorization: Bearer $TOKEN"

# Replace all azure_dw rows with a fresh 5 000-row batch
curl -X POST "http://localhost:8000/admin/import-jobs-azure?limit=5000&replace=true" \
  -H "Authorization: Bearer $TOKEN"

# Import everything (~159 k) — slow on S0, allow 10 min
curl -X POST "http://localhost:8000/admin/import-jobs-azure?limit=0&replace=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Performance Notes

- Azure S0 = 10 DTUs. Full import of 159 k rows takes ~5–10 minutes.
- Default limit (`AZURE_SQL_IMPORT_LIMIT=5000`) completes in ~30 seconds.
- Rows are inserted in batches of 500 to avoid long transaction locks.
- The existing 40 k CSV jobs + 80 seed jobs provide full app functionality
  without any Azure connection.

---

## Security

- Credentials live only in `.env` (gitignored) and in Docker container env vars.
- Never commit `.env`. The `.env.example` file shipped in the repo has no secrets.
- Rotate the Azure SQL password in the Azure portal if it was ever exposed in chat
  or logs.
- Production: pass secrets via CI/CD secret variables, not plain-text files.
