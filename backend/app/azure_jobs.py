"""azure_jobs.py — Import job offers from the Azure SQL **Jobs_DW** data warehouse.

The warehouse is a star schema in the ``dw`` schema:

    FACT_JOB_POSTING  ──┬─ DIM_JOB       (title, schedule)
                        ├─ DIM_COMPANY   (company_name)
                        ├─ DIM_LOCATION  (location, country)
                        ├─ DIM_VIA       (source channel)
                        └─ DIM_DATE      (posted date)
    FACT_JOB_SKILL  ─ DIM_SKILL          (skills per job, aggregated)

(The ``dbo.stg_jobmatch_raw`` staging table is a mis-parsed raw CSV dump and is
intentionally **not** used.)

This module joins the star schema and loads the result into the app's local
``jobs`` table with ``source='azure_dw'`` so the rest of the app (the /jobs page
and the recommender) keeps working unchanged.

Connection is configured entirely via environment variables (kept in .env):

    AZURE_SQL_SERVER     e.g. cverify.database.windows.net
    AZURE_SQL_DB         e.g. Jobs_DW
    AZURE_SQL_USER       e.g. cverify_test
    AZURE_SQL_PASSWORD   (never committed)
    AZURE_SQL_PORT       default 1433
"""
from __future__ import annotations

import os
from datetime import datetime

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from .models import Job


def azure_configured() -> bool:
    """True when all required Azure SQL env vars are present."""
    return all(
        os.getenv(k)
        for k in ("AZURE_SQL_SERVER", "AZURE_SQL_DB", "AZURE_SQL_USER", "AZURE_SQL_PASSWORD")
    )


def _engine():
    """Build a SQLAlchemy engine for Azure SQL (pymssql/FreeTDS handles TLS).

    URL.create() is used so special characters in the password (e.g. ``+``) are
    handled correctly without manual URL-encoding.
    """
    url = URL.create(
        "mssql+pymssql",
        username=os.environ["AZURE_SQL_USER"],
        password=os.environ["AZURE_SQL_PASSWORD"],
        host=os.environ["AZURE_SQL_SERVER"],
        port=int(os.getenv("AZURE_SQL_PORT", "1433")),
        database=os.environ["AZURE_SQL_DB"],
    )
    return create_engine(
        url,
        connect_args={"timeout": 60, "login_timeout": 30},
        pool_pre_ping=True,
    )


# One row per posting, columns aliased to match the app's Job model.
_DW_QUERY = """
SELECT {top}
    j.job_title_short        AS title_short,
    j.job_title              AS title,
    j.job_schedule_type      AS schedule_type,
    l.job_location           AS location,
    l.job_country            AS country,
    v.job_via                AS via,
    d.full_date              AS posted_date,
    f.work_from_home_flag    AS wfh,
    f.no_degree_mention_flag AS no_degree,
    f.health_insurance_flag  AS health,
    f.salary_rate            AS salary_rate,
    f.salary_year_avg        AS salary_year_avg,
    f.salary_hour_avg        AS salary_hour_avg,
    c.company_name           AS company_name,
    sk.skills                AS skills
FROM dw.FACT_JOB_POSTING f
LEFT JOIN dw.DIM_JOB j      ON f.job_id = j.job_id
LEFT JOIN dw.DIM_COMPANY c  ON f.company_id = c.company_id
LEFT JOIN dw.DIM_LOCATION l ON f.location_id = l.location_id
LEFT JOIN dw.DIM_VIA v      ON f.via_id = v.via_id
LEFT JOIN dw.DIM_DATE d     ON f.date_id = d.date_id
LEFT JOIN (
    SELECT fs.job_id, STRING_AGG(CAST(s.skill_name AS NVARCHAR(MAX)), ', ') AS skills
    FROM dw.FACT_JOB_SKILL fs
    JOIN dw.DIM_SKILL s ON fs.skill_id = s.skill_id
    GROUP BY fs.job_id
) sk ON sk.job_id = f.job_id
ORDER BY f.posting_id
"""


def _t(val, n: int):
    """Trim a value to fit a VARCHAR(n) column (Postgres enforces lengths)."""
    if val is None:
        return None
    s = str(val).strip()
    return s[:n] if s else None


def _to_float(v):
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def fetch_dw_jobs(limit: int | None = 5000):
    """Run the star-schema join against Azure SQL and return mapping rows."""
    eng = _engine()
    top = f"TOP ({int(limit)})" if limit and limit > 0 else ""
    sql = _DW_QUERY.format(top=top)
    try:
        with eng.connect() as conn:
            return conn.execute(text(sql)).mappings().all()
    finally:
        eng.dispose()


def import_azure_jobs(db, limit: int | None = 5000, replace: bool = False) -> int:
    """Pull offers from Azure DW into the local ``jobs`` table.

    Args:
        db: SQLAlchemy session.
        limit: max postings to import (None/0 = all 158k — heavy on an S0 tier).
        replace: if True, delete existing ``source='azure_dw'`` rows first.

    Returns the number of rows inserted.
    """
    rows = fetch_dw_jobs(limit)

    if replace:
        db.query(Job).filter(Job.source == "azure_dw").delete(synchronize_session=False)
        db.commit()

    count = 0
    batch = []
    for r in rows:
        posted = r["posted_date"]
        if posted is not None and not isinstance(posted, datetime):
            try:
                posted = datetime(posted.year, posted.month, posted.day)
            except Exception:
                posted = None

        batch.append(Job(
            title_short=_t(r["title_short"], 200),
            title=_t(r["title"] or r["title_short"], 500) or "Untitled",
            location=_t(r["location"], 300),
            via=_t(r["via"], 200),
            schedule_type=_t(r["schedule_type"], 100),
            work_from_home=bool(r["wfh"]),
            country=_t(r["country"], 100),
            posted_date=posted,
            no_degree_mention=bool(r["no_degree"]),
            health_insurance=bool(r["health"]),
            salary_rate=_t(r["salary_rate"], 50),
            salary_year_avg=_to_float(r["salary_year_avg"]),
            salary_hour_avg=_to_float(r["salary_hour_avg"]),
            company_name=_t(r["company_name"], 300),
            skills=r["skills"] or None,
            source="azure_dw",
        ))
        count += 1
        if len(batch) >= 500:
            db.add_all(batch)
            db.commit()
            batch = []
    if batch:
        db.add_all(batch)
        db.commit()
    return count
