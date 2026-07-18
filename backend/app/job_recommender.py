"""
job_recommender.py  –  Job recommendation engine for CVerify.

Supports two model formats:
  - v1: job_recommender.pkl (TF-IDF + category centroids — 24 categories)
  - v2: job_recommender_v2.pkl (TF-IDF + per-job vectors — 20K real jobs)

v2 is preferred when available: it recommends specific job postings
from data_jobs.csv, not just categories.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import TypedDict

import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ── Human-readable labels for each category code ─────────────────────────────
CATEGORY_LABELS: dict[str, str] = {
    "ACCOUNTANT":           "Accountant / Auditor",
    "ADVOCATE":             "Legal Advocate / Lawyer",
    "AGRICULTURE":          "Agriculture / Farming",
    "APPAREL":              "Fashion / Apparel",
    "ARTS":                 "Arts & Creative",
    "AUTOMOBILE":           "Automobile / Automotive",
    "AVIATION":             "Aviation / Aerospace",
    "BANKING":              "Banking & Financial Services",
    "BPO":                  "BPO / Customer Support",
    "BUSINESS-DEVELOPMENT": "Business Development",
    "CHEF":                 "Chef / Culinary",
    "CONSTRUCTION":         "Construction / Civil Engineering",
    "CONSULTANT":           "Consultant / Advisory",
    "DESIGNER":             "Designer / UX / Graphic",
    "DIGITAL-MEDIA":        "Digital Media / Content",
    "ENGINEERING":          "Engineering (General)",
    "FINANCE":              "Finance / Investment",
    "FITNESS":              "Fitness / Sports / Wellness",
    "HEALTHCARE":           "Healthcare / Medical",
    "HR":                   "Human Resources",
    "INFORMATION-TECHNOLOGY": "Information Technology / Software",
    "PUBLIC-RELATIONS":     "Public Relations / Communications",
    "SALES":                "Sales & Marketing",
    "TEACHER":              "Teacher / Education",
}


class JobMatch(TypedDict):
    rank: int
    category: str          # raw code e.g. "INFORMATION-TECHNOLOGY"
    label: str             # human label e.g. "Information Technology / Software"
    similarity_score: float  # 0-1
    confidence_pct: float    # percentage among top-5


class JobRecommendation(TypedDict):
    rank: int
    job_title: str
    company: str
    location: str
    salary_avg: float | None
    skills: str
    similarity_score: float
    matched_skills: list[str]


# ── Loader (lazy singleton) ───────────────────────────────────────────────────
_bundle: dict | None = None
_bundle_v2: dict | None = None


def _load_bundle(models_dir: Path) -> dict:
    global _bundle
    if _bundle is None:
        pkl = models_dir / "job_recommender.pkl"
        if not pkl.exists():
            raise FileNotFoundError(
                f"job_recommender.pkl not found at {pkl}. "
                "Run backend/scripts/train_job_recommender.py first."
            )
        _bundle = joblib.load(pkl)
    return _bundle


def _load_bundle_v2(models_dir: Path) -> dict | None:
    global _bundle_v2
    if _bundle_v2 is None:
        pkl = models_dir / "job_recommender_v2.pkl"
        if not pkl.exists():
            return None
        _bundle_v2 = joblib.load(pkl)
    return _bundle_v2


# ── Text cleaning (must match training) ──────────────────────────────────────
def _clean(text: str) -> str:
    text = re.sub(r"http\S+", "", str(text))
    text = re.sub(r"[^\w\s]", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


# ── Public API ────────────────────────────────────────────────────────────────

def _extract_skills(text: str) -> set[str]:
    """Extract known skills from text for Jaccard matching (v2 only)."""
    KNOWN = {
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust',
        'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'sql', 'mysql',
        'postgresql', 'mongodb', 'redis', 'aws', 'azure', 'gcp', 'docker',
        'kubernetes', 'terraform', 'jenkins', 'git', 'react', 'angular', 'vue',
        'django', 'flask', 'fastapi', 'spring', 'express', 'pandas', 'numpy',
        'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'spark', 'hadoop',
        'tableau', 'power bi', 'machine learning', 'deep learning', 'nlp',
        'agile', 'scrum', 'jira', 'linux', 'rest', 'graphql', 'kafka',
    }
    text_lower = text.lower()
    found = set()
    for skill in KNOWN:
        pattern = r"(?<![a-zA-Z])" + re.escape(skill) + r"(?![a-zA-Z])"
        if re.search(pattern, text_lower):
            found.add(skill)
    return found


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    union = a | b
    return len(a & b) / len(union) if union else 0.0


def recommend_jobs_v2(
    cv_text: str,
    models_dir: Path,
    top_n: int = 5,
) -> list[JobRecommendation]:
    """Recommend specific job postings using the v2 hybrid model."""
    bundle = _load_bundle_v2(models_dir)
    if bundle is None:
        return []

    tfidf = bundle["tfidf"]
    job_vectors = bundle["job_vectors"]
    job_skill_sets = bundle["job_skill_sets"]
    jobs_meta = bundle["jobs_meta"]
    salary_norm = bundle["salary_norm"]
    weights = bundle["best_weights"]

    cleaned = _clean(cv_text)
    vec = tfidf.transform([cleaned])

    # Text similarity
    text_sims = cosine_similarity(vec, job_vectors)[0]

    # Skill similarity
    resume_skills = _extract_skills(cv_text)
    if resume_skills:
        skill_sims = np.array([_jaccard(resume_skills, js) for js in job_skill_sets])
    else:
        skill_sims = np.zeros(len(jobs_meta))

    # Combined score
    combined = (
        weights["w_text"] * text_sims +
        weights["w_skill"] * skill_sims +
        weights["w_salary"] * salary_norm
    )

    top_idx = np.argsort(combined)[::-1][:top_n]
    results: list[JobRecommendation] = []
    for rank, idx in enumerate(top_idx, 1):
        row = jobs_meta.iloc[idx]
        matched = sorted(resume_skills & job_skill_sets[idx]) if resume_skills else []
        results.append(
            JobRecommendation(
                rank=rank,
                job_title=str(row.get("job_title", "")),
                company=str(row.get("company_name", "")),
                location=str(row.get("job_location", "")),
                salary_avg=float(row["salary_year_avg"]) if row.get("salary_year_avg") and not np.isnan(row["salary_year_avg"]) else None,
                skills=str(row.get("job_skills", "")),
                similarity_score=round(float(combined[idx]), 4),
                matched_skills=matched,
            )
        )
    return results


def recommend_jobs(
    cv_text: str,
    models_dir: Path,
    top_n: int = 5,
) -> list[JobMatch]:
    """
    Given raw CV text, return the top-N recommended job categories.
    Falls back to v1 category-based if v2 is not available.
    """
    bundle = _load_bundle(models_dir)
    tfidf: any = bundle["tfidf"]
    categories: list[str] = bundle["categories"]
    centroids: np.ndarray = bundle["centroids"]

    cleaned = _clean(cv_text)
    vec = tfidf.transform([cleaned])
    sims: np.ndarray = cosine_similarity(vec, centroids)[0]

    top_indices = np.argsort(sims)[::-1][:top_n]
    top_scores = sims[top_indices]

    # Confidence = each score as % of the sum of top scores
    total = top_scores.sum() if top_scores.sum() > 0 else 1.0

    results: list[JobMatch] = []
    for rank, (idx, score) in enumerate(zip(top_indices, top_scores), start=1):
        cat = categories[idx]
        results.append(
            JobMatch(
                rank=rank,
                category=cat,
                label=CATEGORY_LABELS.get(cat, cat.replace("-", " ").title()),
                similarity_score=round(float(score), 4),
                confidence_pct=round(float(score / total) * 100, 1),
            )
        )

    return results
