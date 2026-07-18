from __future__ import annotations

import pandas as pd

from .schemas import CandidateCreate

# Skills that were one-hot encoded during training
_BINARY_SKILLS = [
    "Python", "SQL", "Ethical_Hacking", "TensorFlow",
    "Machine_Learning", "NLP", "Linux", "Pytorch",
    "Java", "Deep_Learning",
]

# Education ordinal mapping matching training preprocessing
_EDUCATION_MAP = {
    "high school": 0,
    "associate": 1,
    "bachelor": 2,
    "master": 3,
    "phd": 4,
    "doctorate": 4,
    "mba": 3,
    "b.tech": 2,
    "m.tech": 3,
    "b.sc": 2,
    "m.sc": 3,
    "bsc": 2,
    "msc": 3,
    "be": 2,
    "me": 3,
}


def _education_level(edu: str | None) -> int:
    """Map education string to ordinal integer."""
    if not edu:
        return 2  # default: bachelor
    low = edu.lower()
    for key, val in _EDUCATION_MAP.items():
        if key in low:
            return val
    return 2  # fallback


def build_features(payload: CandidateCreate) -> pd.DataFrame:
    skills_str = ", ".join(payload.skills) if payload.skills else ""
    skills_lower = skills_str.lower()

    row: dict = {
        # Raw columns consumed by the ColumnTransformer
        "Skills": skills_str,
        "Experience (Years)": payload.experience_years,
        "Education": payload.education or "Bachelor",
        "Certifications": payload.certifications or "",
        "Job Role": payload.job_role or "Other",
        "Projects Count": payload.projects_count,
        "AI Score (0-100)": payload.ai_score,
        # Derived / engineered features
        "skill_count": len([s for s in skills_str.split(",") if s.strip()]),
        "has_certification": 1 if payload.certifications else 0,
        "exp_per_project": payload.experience_years / (payload.projects_count + 1),
        "total_work_score": payload.experience_years + payload.projects_count,
        "ai_exp_ratio": payload.ai_score / (payload.experience_years + 1),
        "education_level": _education_level(payload.education),
    }

    # Binary skill flags matching training columns
    for skill in _BINARY_SKILLS:
        row[f"has_{skill}"] = 1 if skill.lower().replace("_", " ") in skills_lower else 0

    return pd.DataFrame([row])

