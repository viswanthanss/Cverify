from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CVBase(BaseModel):
    experience_years: float = Field(alias="Experience (Years)")
    projects_count: int = Field(alias="Projects Count")
    ai_score: float = Field(alias="AI Score (0-100)")
    skills: list[str] = Field(alias="Skills")
    education: str | None = Field(default=None, alias="Education")
    job_role: str | None = Field(default=None, alias="Job Role")
    certifications: str | None = Field(default=None, alias="Certifications")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("skills", mode="before")
    @classmethod
    def normalize_skills(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return [str(value).strip()]


class CandidateCreate(CVBase):
    full_name: str | None = Field(default=None, alias="Full Name")
    email: str | None = Field(default=None, alias="Email")
    phone: str | None = Field(default=None, alias="Phone")


class CandidateUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    education: str | None = None
    job_role: str | None = None
    experience_years: float | None = None
    projects_count: int | None = None
    ai_score: float | None = None
    skills: list[str] | None = None
    certifications: str | None = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("skills", mode="before")
    @classmethod
    def normalize_skills(cls, value: Any) -> list[str] | None:
        if value is None:
            return None
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return [str(value).strip()]


class PredictionOut(BaseModel):
    hire_probability: float
    predicted_salary: float
    candidate_cluster: int | None
    recommendation: str


class CandidateOut(BaseModel):
    id: int
    full_name: str | None
    email: str | None
    phone: str | None
    education: str | None
    job_role: str | None
    experience_years: float
    projects_count: int
    ai_score: float
    skills: list[str]
    certifications: str | None
    hire_probability: float | None
    predicted_salary: float | None
    candidate_cluster: int | None
    recommendation: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── User / Auth Schemas ───────────────────────────────────────

class UserRegister(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str | None = None
    role: str = "candidate"
    company: str | None = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    company: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: str | None = None
    company: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Job Schemas ───────────────────────────────────────────────

class JobOut(BaseModel):
    id: int
    title_short: str | None
    title: str
    location: str | None
    via: str | None
    schedule_type: str | None
    work_from_home: bool
    country: str | None
    posted_date: datetime | None
    no_degree_mention: bool = False
    health_insurance: bool = False
    salary_rate: str | None
    salary_year_avg: float | None
    salary_hour_avg: float | None
    company_name: str | None
    skills: str | None
    source: str
    job_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class JobSearch(BaseModel):
    query: str | None = None
    location: str | None = None
    remote_only: bool = False
    skills: list[str] | None = None
    salary_min: float | None = None
    page: int = 1
    per_page: int = 20


# ── Recruiter Job Post Schemas ────────────────────────────────

class RecruiterPostCreate(BaseModel):
    title: str
    description: str | None = None
    category: str | None = None
    location: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    required_skills: str | None = None
    company_name: str | None = None


class RecruiterPostOut(BaseModel):
    id: int
    user_id: int
    title: str
    description: str | None
    category: str | None
    location: str | None
    salary_min: float | None
    salary_max: float | None
    required_skills: str | None
    company_name: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    applications_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ── Job Application Schemas ───────────────────────────────────

class ApplicationCreate(BaseModel):
    job_post_id: int | None = None
    job_id: int | None = None
    cv_id: int | None = None
    cover_letter: str | None = None


class ApplicationOut(BaseModel):
    id: int
    user_id: int
    job_post_id: int | None
    job_id: int | None
    cv_id: int | None
    status: str
    cover_letter: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationDetailOut(BaseModel):
    """Enriched application info for the candidate portal."""
    id: int
    user_id: int
    job_post_id: int | None
    job_id: int | None
    cv_id: int | None
    status: str
    cover_letter: str | None
    created_at: datetime
    updated_at: datetime
    # enriched fields resolved at query time
    job_title: str | None = None
    company_name: str | None = None
    job_location: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CVHistoryOut(BaseModel):
    """CV analysis history entry for the candidate portal."""
    id: int
    job_role: str | None
    experience_years: float
    ai_score: float
    hire_probability: float | None
    predicted_salary: float | None
    candidate_cluster: int | None
    recommendation: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Notification Schemas ──────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    data: dict | None = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Application Status Update ─────────────────────────────────

class ApplicationStatusUpdate(BaseModel):
    status: str                          # accepted | rejected | reviewed
    # Accept fields
    meeting_type: str | None = None      # video | phone | in-person
    meeting_slots: list[str] | None = None
    meeting_link: str | None = None
    meeting_location: str | None = None
    recruiter_contact: str | None = None
    preparation_notes: str | None = None
    # Reject fields
    rejection_reason: str | None = None


# ── Enriched Application Detail (Recruiter view) ──────────────

class ApplicationFullOut(BaseModel):
    id: int
    user_id: int
    job_post_id: int | None
    job_id: int | None
    cv_id: int | None
    status: str
    cover_letter: str | None
    created_at: datetime
    updated_at: datetime
    # Job info
    job_title: str | None = None
    company_name: str | None = None
    job_location: str | None = None
    required_skills: str | None = None
    # Candidate profile
    candidate_name: str | None = None
    candidate_email: str | None = None
    candidate_phone: str | None = None
    # CV / AI fields
    cv_skills: list[str] | None = None
    cv_education: str | None = None
    cv_experience_years: float | None = None
    cv_projects_count: int | None = None
    cv_certifications: str | None = None
    hire_probability: float | None = None
    predicted_salary: float | None = None
    candidate_cluster: int | None = None
    recommendation: str | None = None
    # Computed AI analysis
    match_score: float | None = None          # 0-100
    matched_skills: list[str] | None = None
    missing_skills: list[str] | None = None
    experience_level: str | None = None       # Junior | Mid-level | Senior
    strengths: list[str] | None = None
    red_flags: list[str] | None = None
    ai_recommendation: str | None = None      # Shortlist | Maybe | Pass
    # Meeting details (if accepted)
    meeting_type: str | None = None
    meeting_slots: list[str] | None = None
    meeting_link: str | None = None
    meeting_location: str | None = None
    recruiter_contact: str | None = None
    preparation_notes: str | None = None
    rejection_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)


# ── Enriched Application (Candidate view with meeting details) ─

class ApplicationDetailOut(BaseModel):
    """Enriched application info for the candidate portal."""
    id: int
    user_id: int
    job_post_id: int | None
    job_id: int | None
    cv_id: int | None
    status: str
    cover_letter: str | None
    created_at: datetime
    updated_at: datetime
    # enriched fields resolved at query time
    job_title: str | None = None
    company_name: str | None = None
    job_location: str | None = None
    # Meeting details visible to candidate when accepted
    meeting_type: str | None = None
    meeting_slots: list[str] | None = None
    meeting_link: str | None = None
    meeting_location: str | None = None
    recruiter_contact: str | None = None
    preparation_notes: str | None = None
    rejection_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)
