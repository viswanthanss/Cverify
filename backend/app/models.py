from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from .db import Base


# ── Users & Authentication ────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    role = Column(String(50), nullable=False, default="candidate")  # candidate | recruiter | admin
    company = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ── Candidate CVs ─────────────────────────────────────────────
class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    full_name = Column(String(200), nullable=True)
    email = Column(String(200), nullable=True)
    phone = Column(String(100), nullable=True)

    education = Column(String(200), nullable=True)
    job_role = Column(String(200), nullable=True)
    experience_years = Column(Float, nullable=False)
    projects_count = Column(Integer, nullable=False)
    ai_score = Column(Float, nullable=False)
    score_travail_total = Column(Float, nullable=False)
    skills = Column(Text, nullable=False)
    certifications = Column(Text, nullable=True)

    hire_probability = Column(Float, nullable=True)
    predicted_salary = Column(Float, nullable=True)
    candidate_cluster = Column(Integer, nullable=True)
    recommendation = Column(Text, nullable=True)

    raw_payload = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ── Jobs (from data_jobs.csv + scraped) ───────────────────────
class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title_short = Column(String(200), nullable=True, index=True)
    title = Column(String(500), nullable=False)
    location = Column(String(300), nullable=True)
    via = Column(String(200), nullable=True)
    schedule_type = Column(String(100), nullable=True)
    work_from_home = Column(Boolean, default=False)
    country = Column(String(100), nullable=True)
    posted_date = Column(DateTime, nullable=True)
    no_degree_mention = Column(Boolean, default=False)
    health_insurance = Column(Boolean, default=False)
    salary_rate = Column(String(50), nullable=True)
    salary_year_avg = Column(Float, nullable=True)
    salary_hour_avg = Column(Float, nullable=True)
    company_name = Column(String(300), nullable=True)
    skills = Column(Text, nullable=True)
    skills_typed = Column(Text, nullable=True)
    source = Column(String(100), default="dataset")  # dataset | scraper | recruiter
    job_url = Column(String(500), nullable=True)  # external apply link (scraped jobs)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── Scrape Logs ───────────────────────────────────────────────
class ScrapeLog(Base):
    __tablename__ = "scrape_logs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(200), nullable=False)
    records_added = Column(Integer, default=0)
    status = Column(String(50), default="success")
    error_message = Column(Text, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── Recruiter Job Posts ───────────────────────────────────────
class RecruiterJobPost(Base):
    __tablename__ = "recruiter_job_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    required_skills = Column(Text, nullable=True)
    company_name = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ── Job Applications ─────────────────────────────────────────
class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_post_id = Column(Integer, ForeignKey("recruiter_job_posts.id"), nullable=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)
    cv_id = Column(Integer, ForeignKey("candidate_cvs.id"), nullable=True)
    status = Column(String(50), nullable=False, default="pending")  # pending | reviewed | accepted | rejected
    cover_letter = Column(Text, nullable=True)
    # Recruiter response fields
    meeting_type = Column(String(50), nullable=True)       # video | phone | in-person
    meeting_slots = Column(Text, nullable=True)            # JSON list of proposed slots
    meeting_link = Column(String(500), nullable=True)
    meeting_location = Column(String(300), nullable=True)
    recruiter_contact = Column(String(200), nullable=True)
    preparation_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ── Notifications ─────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(60), nullable=False)   # application_received | application_confirmed | accepted | rejected
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(Text, nullable=True)          # JSON extra payload
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
