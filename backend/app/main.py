from __future__ import annotations

import csv
import json
import os
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Query, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from .auth import (
    create_access_token,
    get_current_user,
    get_optional_user,
    hash_password,
    require_role,
    verify_password,
)
from .db import Base, engine, get_db, SessionLocal
from .feature_builder import build_features
from .models import CandidateCV, Job, JobApplication, Notification, RecruiterJobPost, ScrapeLog, User
from .job_recommender import JobMatch, recommend_jobs, recommend_jobs_v2
from .pdf_parser import PDFParseError, parse_cv_pdf
from .predictor import ModelBundle
from .recommendation import build_recommendation
from .schemas import (
    ApplicationCreate,
    ApplicationDetailOut,
    ApplicationFullOut,
    ApplicationOut,
    ApplicationStatusUpdate,
    CandidateCreate,
    CandidateOut,
    CandidateUpdate,
    CVHistoryOut,
    JobOut,
    JobSearch,
    NotificationOut,
    PredictionOut,
    RecruiterPostCreate,
    RecruiterPostOut,
    TokenOut,
    UserLogin,
    UserOut,
    UserRegister,
    UserUpdate,
)

BASE_DIR = Path(__file__).resolve().parents[1]

app = FastAPI(title="CVerify API", version="1.0.0")
# where headers might be stripped or misconfigured on error responses.
allowed_origins = ["*"]

# If specific origins are provided in env, use them, but the wildcard is the safest fix for "No Access-Control-Allow-Origin"
if os.getenv("ALLOWED_ORIGINS"):
    allowed_origins = [
        origin.strip() for origin in os.getenv("ALLOWED_ORIGINS").split(",") if origin.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    error_msg = traceback.format_exc()
    print(f"CRITICAL ERROR: {error_msg}")
    return JSONResponse(
        content={"detail": str(exc), "error": "Internal Server Error", "trace": error_msg},
        status_code=500,
        headers={"Access-Control-Allow-Origin": "*"}
    )


def load_models() -> ModelBundle:
    try:
        return ModelBundle(BASE_DIR)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def predict(payload: CandidateCreate, models: ModelBundle) -> PredictionOut:
    features = build_features(payload)

    # XGBoost Classifier: classes_ contains string labels from the training data
    # e.g. ["Hired", "Not Hired"] sorted alphabetically → index 0 = "Hired"
    # We find the correct index dynamically to be safe
    proba = models.classifier.predict_proba(features)[0]
    classes = list(models.classifier.classes_)

    hire_index = 0
    for i, label in enumerate(classes):
        if "hire" in str(label).lower() and "not" not in str(label).lower():
            hire_index = i
            break

    hire_prob = float(proba[hire_index])
    salary = float(models.regressor.predict(features)[0])

    # KMeans was trained on a ColumnTransformer with these numeric columns
    cluster = None
    if models.kmeans:
        try:
            km_bundle = models.kmeans  # dict with 'kmeans', 'preprocessor', etc.
            if isinstance(km_bundle, dict):
                km_pre = km_bundle.get("preprocessor")
                km_model = km_bundle.get("kmeans")
                if km_pre is not None and km_model is not None:
                    km_features = km_pre.transform(features)
                    cluster = int(km_model.predict(km_features)[0])
            else:
                # Fallback: raw KMeans model with numeric features
                KMEANS_COLS = [
                    "Experience (Years)", "Projects Count", "AI Score (0-100)",
                    "skill_count", "total_work_score", "ai_exp_ratio", "education_level",
                    "has_certification",
                ]
                km_input = features[[c for c in KMEANS_COLS if c in features.columns]].fillna(0)
                cluster = int(km_bundle.predict(km_input)[0])
        except Exception:
            cluster = None

    recommendation = build_recommendation(
        hire_probability=hire_prob,
        predicted_salary=salary,
        candidate_cluster=cluster,
        job_role=payload.job_role,
    )

    return PredictionOut(
        hire_probability=round(hire_prob, 3),
        predicted_salary=round(salary, 2),
        candidate_cluster=cluster,
        recommendation=recommendation,
    )


def skills_to_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def candidate_to_payload(candidate: CandidateCV) -> CandidateCreate:
    return CandidateCreate(
        full_name=candidate.full_name,
        email=candidate.email,
        phone=candidate.phone,
        education=candidate.education,
        job_role=candidate.job_role,
        experience_years=candidate.experience_years,
        projects_count=candidate.projects_count,
        ai_score=candidate.ai_score,
        skills=skills_to_list(candidate.skills),
        certifications=candidate.certifications,
    )


def candidate_to_out(candidate: CandidateCV) -> CandidateOut:
    return CandidateOut(
        id=candidate.id,
        full_name=candidate.full_name,
        email=candidate.email,
        phone=candidate.phone,
        education=candidate.education,
        job_role=candidate.job_role,
        experience_years=candidate.experience_years,
        projects_count=candidate.projects_count,
        ai_score=candidate.ai_score,
        skills=skills_to_list(candidate.skills),
        certifications=candidate.certifications,
        hire_probability=candidate.hire_probability,
        predicted_salary=candidate.predicted_salary,
        candidate_cluster=candidate.candidate_cluster,
        recommendation=candidate.recommendation,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
    )


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    # Run safe migrations for any new columns
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_url VARCHAR(500)"
        ))
        # JobApplication new columns for recruiter response
        for col_sql in [
            "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(50)",
            "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS meeting_slots TEXT",
            "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500)",
            "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS meeting_location VARCHAR(300)",
            "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS recruiter_contact VARCHAR(200)",
            "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS preparation_notes TEXT",
            "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
        ]:
            conn.execute(text(col_sql))
        conn.commit()
    # Seed DB with sample candidates if empty
    from .seed_data import seed_database, seed_jobs_from_csv, seed_users
    db = SessionLocal()
    try:
        n_users = seed_users(db)
        if n_users > 0:
            print(f"[CVerify] Seeded {n_users} default user accounts.")
        n = seed_database(db)
        if n > 0:
            print(f"[CVerify] Seeded database with {n} sample candidates.")

        # Populate job offers if the jobs table is empty.
        # Priority:
        #   1. Azure SQL Jobs_DW  — when AZURE_SQL_* env vars are configured
        #   2. seed_jobs.py       — 80 curated demo jobs (always present in the image)
        #   3. data_jobs.csv      — 40 k bundled jobs (heavy fallback)
        jobs_empty = db.execute(select(Job).limit(1)).first() is None
        if jobs_empty:
            from .azure_jobs import azure_configured, import_azure_jobs
            from .seed_jobs import seed_jobs as seed_jobs_demo
            imported = False
            if azure_configured():
                try:
                    limit_env = os.getenv("AZURE_SQL_IMPORT_LIMIT", "5000").strip().lower()
                    limit = None if limit_env in ("0", "all", "") else int(limit_env)
                    n_az = import_azure_jobs(db, limit=limit)
                    print(f"[CVerify] Imported {n_az} jobs from Azure SQL (Jobs_DW).")
                    imported = True
                except Exception as e:  # network/driver/SQL issue → fall back
                    print(f"[CVerify] Azure import failed ({e!r}); falling back to seed_jobs.")
                    db.rollback()
            if not imported:
                n_seed = seed_jobs_demo(db)
                if n_seed > 0:
                    print(f"[CVerify] Seeded {n_seed} demo jobs from seed_jobs.py.")
                    imported = True
            if not imported:
                jobs_count = seed_jobs_from_csv(db)
                if jobs_count > 0:
                    print(f"[CVerify] Imported {jobs_count} jobs from data_jobs.csv.")
    finally:
        db.close()


@app.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db)) -> dict:
    """Admin — aggregate statistics about all candidates in the DB."""
    candidates = db.execute(select(CandidateCV)).scalars().all()
    if not candidates:
        return {"total": 0, "hired_count": 0, "rejected_count": 0,
                "avg_hire_probability": 0, "avg_predicted_salary": 0,
                "roles_distribution": {}, "clusters_distribution": {}}
    total = len(candidates)
    avg_hire = sum(c.hire_probability or 0 for c in candidates) / total
    avg_salary = sum(c.predicted_salary or 0 for c in candidates) / total
    roles: dict = {}
    clusters: dict = {}
    for c in candidates:
        r = c.job_role or "Unknown"
        roles[r] = roles.get(r, 0) + 1
        cl = str(c.candidate_cluster) if c.candidate_cluster is not None else "N/A"
        clusters[cl] = clusters.get(cl, 0) + 1
    return {
        "total": total,
        "avg_hire_probability": round(avg_hire, 3),
        "avg_predicted_salary": round(avg_salary, 2),
        "roles_distribution": roles,
        "clusters_distribution": clusters,
        "hired_count": sum(1 for c in candidates if (c.hire_probability or 0) >= 0.7),
        "rejected_count": sum(1 for c in candidates if (c.hire_probability or 0) < 0.5),
    }


@app.delete("/admin/reset", status_code=200)
def admin_reset_db(db: Session = Depends(get_db)) -> dict:
    """Admin — delete ALL candidates (dev/testing only)."""
    from sqlalchemy import delete as sql_delete
    db.execute(sql_delete(CandidateCV))
    db.commit()
    return {"message": "All candidates deleted."}


@app.post("/admin/create-admin", status_code=201)
def create_admin_user(db: Session = Depends(get_db)) -> dict:
    """Bootstrap — create the default admin account if it doesn't exist yet."""
    existing = db.execute(select(User).where(User.email == "admin@cverify.com")).scalar_one_or_none()
    if existing:
        return {"message": "Admin already exists.", "email": "admin@cverify.com"}
    admin = User(
        full_name="Admin",
        email="admin@cverify.com",
        hashed_password=hash_password("Admin1234!"),
        role="admin",
    )
    db.add(admin)
    db.commit()
    return {"message": "Admin created.", "email": "admin@cverify.com", "password": "Admin1234!"}


@app.post("/admin/reseed", status_code=200)
def admin_reseed(db: Session = Depends(get_db)) -> dict:
    """Admin — wipe and reseed DB with sample candidates."""
    from sqlalchemy import delete as sql_delete
    from .seed_data import seed_database
    db.execute(sql_delete(CandidateCV))
    db.commit()
    n = seed_database(db)
    return {"message": f"Reseeded with {n} candidates."}


@app.post("/admin/reseed-jobs", status_code=200)
def admin_reseed_jobs(db: Session = Depends(get_db)) -> dict:
    """Admin — wipe and reseed jobs table from seed_jobs.py."""
    from sqlalchemy import delete as sql_delete
    from .seed_jobs import seed_jobs as seed_jobs_demo
    db.execute(sql_delete(Job))
    db.commit()
    n = seed_jobs_demo(db)
    return {"message": f"Reseeded with {n} demo jobs."}


@app.post("/admin/reseed-all", status_code=200)
def admin_reseed_all(db: Session = Depends(get_db)) -> dict:
    """Admin — wipe ALL data (users, candidates, jobs, applications, notifications, posts) then reseed."""
    from sqlalchemy import delete as sql_delete
    from .seed_data import seed_database, seed_users
    from .seed_jobs import seed_jobs as seed_jobs_demo
    # Delete in FK-safe order
    db.execute(sql_delete(Notification))
    db.execute(sql_delete(JobApplication))
    db.execute(sql_delete(RecruiterJobPost))
    db.execute(sql_delete(ScrapeLog))
    db.execute(sql_delete(CandidateCV))
    db.execute(sql_delete(Job))
    db.execute(sql_delete(User))
    db.commit()
    n_users = seed_users(db)
    n_candidates = seed_database(db)
    n_jobs = seed_jobs_demo(db)
    return {"message": f"Wiped all data. Reseeded {n_users} users, {n_candidates} candidates and {n_jobs} jobs."}


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionOut)
def run_prediction(payload: CandidateCreate) -> PredictionOut:
    models = load_models()
    return predict(payload, models)


@app.post("/cvs", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def create_cv(
    payload: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> CandidateOut:
    models = load_models()
    prediction = predict(payload, models)
    candidate = CandidateCV(
        user_id=current_user.id if current_user else None,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        education=payload.education,
        job_role=payload.job_role,
        experience_years=payload.experience_years,
        projects_count=payload.projects_count,
        ai_score=payload.ai_score,
        score_travail_total=payload.experience_years + payload.projects_count,
        skills=", ".join(payload.skills),
        certifications=payload.certifications,
        hire_probability=prediction.hire_probability,
        predicted_salary=prediction.predicted_salary,
        candidate_cluster=prediction.candidate_cluster,
        recommendation=prediction.recommendation,
        raw_payload=json.dumps(payload.model_dump()),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate_to_out(candidate)


@app.post("/cvs/bulk", response_model=list[CandidateOut], status_code=status.HTTP_201_CREATED)
def create_cvs_bulk(
        payloads: list[CandidateCreate],
        db: Session = Depends(get_db),
) -> list[CandidateOut]:
    models = load_models()
    results: list[CandidateOut] = []
    for payload in payloads:
        prediction = predict(payload, models)
        candidate = CandidateCV(
            full_name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
            education=payload.education,
            job_role=payload.job_role,
            experience_years=payload.experience_years,
            projects_count=payload.projects_count,
            ai_score=payload.ai_score,
            score_travail_total=payload.experience_years + payload.projects_count,
            skills=", ".join(payload.skills),
            certifications=payload.certifications,
            hire_probability=prediction.hire_probability,
            predicted_salary=prediction.predicted_salary,
            candidate_cluster=prediction.candidate_cluster,
            recommendation=prediction.recommendation,
            raw_payload=json.dumps(payload.model_dump()),
        )
        db.add(candidate)
        results.append(candidate)
    db.commit()
    for candidate in results:
        db.refresh(candidate)
    return [candidate_to_out(c) for c in results]



@app.post("/cvs/upload-pdf", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
async def upload_cv_pdf(
        file: UploadFile = File(..., description="PDF resume file"),
        db: Session = Depends(get_db),
        current_user: User | None = Depends(get_optional_user),
) -> CandidateOut:
    """
    Upload a PDF CV → parse fields via AI → run ML models → store in DB.
    Returns the full CandidateOut with hire_probability, predicted_salary,
    cluster, and recommendation already computed.
    """
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted. Please upload a .pdf file.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        parsed_fields = parse_cv_pdf(pdf_bytes)
    except PDFParseError as exc:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {exc}") from exc

    try:
        payload = CandidateCreate(**parsed_fields)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Extracted fields are invalid: {exc}") from exc

    models = load_models()
    prediction = predict(payload, models)

    candidate = CandidateCV(
        user_id=current_user.id if current_user else None,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        education=payload.education,
        job_role=payload.job_role,
        experience_years=payload.experience_years,
        projects_count=payload.projects_count,
        ai_score=payload.ai_score,
        score_travail_total=payload.experience_years + payload.projects_count,
        skills=", ".join(payload.skills),
        certifications=payload.certifications,
        hire_probability=prediction.hire_probability,
        predicted_salary=prediction.predicted_salary,
        candidate_cluster=prediction.candidate_cluster,
        recommendation=prediction.recommendation,
        raw_payload=json.dumps(payload.model_dump()),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate_to_out(candidate)


@app.post("/cvs/parse-pdf", response_model=dict)
async def parse_pdf_preview(
        file: UploadFile = File(..., description="PDF resume file"),
) -> dict:
    """
    Parse a PDF and return the extracted fields WITHOUT saving to DB.
    Useful for a preview/review step before final submission.
    """
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        return parse_cv_pdf(pdf_bytes)
    except PDFParseError as exc:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {exc}") from exc



@app.post("/jobs/recommend", response_model=list[dict])
async def recommend_jobs_from_pdf(
        file: UploadFile = File(..., description="PDF resume file"),
        top_n: int = Query(default=5, ge=1, le=10),
) -> list[dict]:
    """
    Upload a PDF CV → extract text → recommend top matching jobs.
    Uses v2 model (specific job postings) if available, falls back to v1 (categories).
    """
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        from .pdf_parser import extract_text_from_pdf
        raw_text = extract_text_from_pdf(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Text extraction failed: {exc}")

    # Try v2 (specific job recommendations) first
    v2_results = recommend_jobs_v2(raw_text, BASE_DIR / "models", top_n=top_n)
    if v2_results:
        return [dict(m) for m in v2_results]

    # Fall back to v1 (category-based)
    try:
        matches = recommend_jobs(raw_text, BASE_DIR / "models", top_n=top_n)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return [dict(m) for m in matches]


@app.post("/cvs/upload-pdf/full", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_cv_pdf_full(
        file: UploadFile = File(..., description="PDF resume file"),
        db: Session = Depends(get_db),
) -> dict:
    """
    Full pipeline: PDF → parse fields → ML prediction → job recommendations → save to DB.
    Returns CandidateOut + job_recommendations combined.
    """
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 1. Extract raw text for job recommender
    try:
        from .pdf_parser import extract_text_from_pdf
        raw_text = extract_text_from_pdf(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Text extraction failed: {exc}")

    # 2. Parse structured fields (100% local, no API needed)
    try:
        from .pdf_parser import parse_cv_pdf
        parsed_fields = parse_cv_pdf(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {exc}")

    try:
        payload = CandidateCreate(**parsed_fields)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Extracted fields invalid: {exc}")

    # 3. ML prediction (hire probability, salary, cluster)
    models = load_models()
    prediction = predict(payload, models)

    # 4. Job recommendations (local model, no API)
    try:
        job_recs = recommend_jobs(raw_text, BASE_DIR / "models", top_n=5)
    except Exception:
        job_recs = []

    # 5. Save to DB
    candidate = CandidateCV(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        education=payload.education,
        job_role=payload.job_role,
        experience_years=payload.experience_years,
        projects_count=payload.projects_count,
        ai_score=payload.ai_score,
        score_travail_total=payload.experience_years + payload.projects_count,
        skills=", ".join(payload.skills),
        certifications=payload.certifications,
        hire_probability=prediction.hire_probability,
        predicted_salary=prediction.predicted_salary,
        candidate_cluster=prediction.candidate_cluster,
        recommendation=prediction.recommendation,
        raw_payload=json.dumps(payload.model_dump()),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    result = candidate_to_out(candidate).__dict__.copy()
    result["job_recommendations"] = [dict(r) for r in job_recs]
    return result


@app.get("/cvs", response_model=list[CandidateOut])
def list_cvs(
        search: str | None = Query(default=None),
        limit: int = Query(default=50, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
        db: Session = Depends(get_db),
) -> list[CandidateOut]:
    query = select(CandidateCV).order_by(CandidateCV.created_at.desc())
    if search:
        like = f"%{search}%"
        query = query.where(
            (CandidateCV.full_name.ilike(like))
            | (CandidateCV.email.ilike(like))
            | (CandidateCV.job_role.ilike(like))
        )
    results = db.execute(query.limit(limit).offset(offset)).scalars().all()
    return [candidate_to_out(candidate) for candidate in results]


@app.get("/cvs/{candidate_id}", response_model=CandidateOut)
def get_cv(candidate_id: int, db: Session = Depends(get_db)) -> CandidateOut:
    candidate = db.get(CandidateCV, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate_to_out(candidate)


@app.put("/cvs/{candidate_id}", response_model=CandidateOut)
def update_cv(
        candidate_id: int,
        payload: CandidateUpdate,
        db: Session = Depends(get_db),
) -> CandidateOut:
    candidate = db.get(CandidateCV, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "skills" and value is not None:
            setattr(candidate, field, ", ".join(value))
        else:
            setattr(candidate, field, value)

    models = load_models()
    recompute_payload = candidate_to_payload(candidate)
    prediction = predict(recompute_payload, models)
    candidate.hire_probability = prediction.hire_probability
    candidate.predicted_salary = prediction.predicted_salary
    candidate.candidate_cluster = prediction.candidate_cluster
    candidate.recommendation = prediction.recommendation
    candidate.raw_payload = json.dumps(recompute_payload.model_dump())

    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate_to_out(candidate)


@app.delete("/cvs/{candidate_id}", response_class=Response)
def delete_cv(candidate_id: int, db: Session = Depends(get_db)) -> Response:
    candidate = db.get(CandidateCV, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(candidate)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ╔══════════════════════════════════════════════════════════════╗
# ║                    AUTH ENDPOINTS                            ║
# ╚══════════════════════════════════════════════════════════════╝


@app.post("/auth/register", response_model=TokenOut, status_code=201)
def register(body: UserRegister, db: Session = Depends(get_db)) -> TokenOut:
    existing = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=body.email.lower().strip(),
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role if body.role in ("candidate", "recruiter") else "candidate",
        company=body.company,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@app.post("/auth/login", response_model=TokenOut)
def login(body: UserLogin, db: Session = Depends(get_db)) -> TokenOut:
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    token = create_access_token(user.id, user.role)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@app.get("/auth/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@app.put("/auth/me", response_model=UserOut)
def update_me(body: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserOut:
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.company is not None:
        user.company = body.company
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@app.get("/admin/users", response_model=list[UserOut])
def list_users(user: User = Depends(require_role("admin")), db: Session = Depends(get_db)) -> list[UserOut]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserOut.model_validate(u) for u in users]


@app.delete("/admin/users/{user_id}")
def deactivate_user(user_id: int, user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = False
    db.commit()
    return {"message": f"User {target.email} deactivated"}


# ╔══════════════════════════════════════════════════════════════╗
# ║                    JOBS ENDPOINTS                            ║
# ╚══════════════════════════════════════════════════════════════╝


def _recruiter_post_to_job_out(post: RecruiterJobPost) -> JobOut:
    """Convert a RecruiterJobPost to a JobOut for unified display."""
    avg_salary: float | None = None
    if post.salary_min and post.salary_max:
        avg_salary = (post.salary_min + post.salary_max) / 2
    elif post.salary_max:
        avg_salary = float(post.salary_max)
    elif post.salary_min:
        avg_salary = float(post.salary_min)
    return JobOut(
        id=post.id,
        title=post.title,
        title_short=post.category,
        location=post.location,
        via=None,
        schedule_type=None,
        work_from_home=False,
        country=None,
        posted_date=post.created_at,
        no_degree_mention=False,
        health_insurance=False,
        salary_rate="year" if avg_salary else None,
        salary_year_avg=avg_salary,
        salary_hour_avg=None,
        company_name=post.company_name,
        skills=post.required_skills,
        source="recruiter",
        job_url=None,
    )


@app.get("/jobs", response_model=list[JobOut])
def list_jobs(
    query: str | None = Query(default=None),
    location: str | None = Query(default=None),
    remote_only: bool = Query(default=False),
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    salary_min: float | None = Query(default=None),
    source: str | None = Query(default=None, description="Filter by source: dataset, scraper, recruiter"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[JobOut]:
    offset = (page - 1) * per_page

    # --- Recruiter source: query RecruiterJobPost directly ---
    if source == "recruiter":
        rq = db.query(RecruiterJobPost).filter(RecruiterJobPost.is_active == True)  # noqa: E712
        if query:
            like = f"%{query}%"
            rq = rq.filter(or_(RecruiterJobPost.title.ilike(like), RecruiterJobPost.company_name.ilike(like)))
        if location:
            rq = rq.filter(RecruiterJobPost.location.ilike(f"%{location}%"))
        if skills:
            for skill in skills.split(","):
                rq = rq.filter(RecruiterJobPost.required_skills.ilike(f"%{skill.strip()}%"))
        posts = rq.order_by(RecruiterJobPost.created_at.desc()).limit(per_page).offset(offset).all()
        return [_recruiter_post_to_job_out(p) for p in posts]

    # --- Dataset / Scraper / All: query Job table ---
    q = select(Job).order_by(Job.posted_date.desc().nullslast())
    if query:
        like = f"%{query}%"
        q = q.where(or_(Job.title.ilike(like), Job.title_short.ilike(like), Job.company_name.ilike(like)))
    if location:
        q = q.where(or_(Job.location.ilike(f"%{location}%"), Job.country.ilike(f"%{location}%")))
    if remote_only:
        q = q.where(Job.work_from_home == True)  # noqa: E712
    if skills:
        for skill in skills.split(","):
            q = q.where(Job.skills.ilike(f"%{skill.strip()}%"))
    if salary_min:
        q = q.where(Job.salary_year_avg >= salary_min)
    if source:
        q = q.where(Job.source == source)
    results = db.execute(q.limit(per_page).offset(offset)).scalars().all()
    return [JobOut.model_validate(j) for j in results]


@app.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobOut:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobOut.model_validate(job)


@app.get("/jobs/stats/summary")
def jobs_stats(db: Session = Depends(get_db)) -> dict:
    total = db.query(Job).count()
    remote = db.query(Job).filter(Job.work_from_home == True).count()  # noqa: E712
    with_salary = db.query(Job).filter(Job.salary_year_avg.isnot(None)).count()
    return {"total_jobs": total, "remote_jobs": remote, "jobs_with_salary": with_salary}


# ╔══════════════════════════════════════════════════════════════╗
# ║              DATA IMPORT ENDPOINTS                           ║
# ╚══════════════════════════════════════════════════════════════╝


@app.post("/admin/import-jobs-csv", status_code=201)
def import_jobs_csv(
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Import data_jobs.csv into the jobs table."""
    csv_path = BASE_DIR / "data" / "data_jobs.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="data_jobs.csv not found in backend/data/")

    count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch = []
        for row in reader:
            posted = None
            if row.get("job_posted_date"):
                try:
                    posted = datetime.strptime(row["job_posted_date"][:19], "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    pass
            job = Job(
                title_short=row.get("job_title_short") or None,
                title=row.get("job_title", "Unknown"),
                location=row.get("job_location") or None,
                via=row.get("job_via") or None,
                schedule_type=row.get("job_schedule_type") or None,
                work_from_home=row.get("job_work_from_home", "").upper() == "TRUE",
                country=row.get("job_country") or None,
                posted_date=posted,
                no_degree_mention=row.get("job_no_degree_mention", "").upper() == "TRUE",
                health_insurance=row.get("job_health_insurance", "").upper() == "TRUE",
                salary_rate=row.get("salary_rate") or None,
                salary_year_avg=float(row["salary_year_avg"]) if row.get("salary_year_avg") else None,
                salary_hour_avg=float(row["salary_hour_avg"]) if row.get("salary_hour_avg") else None,
                company_name=row.get("company_name") or None,
                skills=row.get("job_skills") or None,
                skills_typed=row.get("job_type_skills") or None,
                source="dataset",
            )
            batch.append(job)
            count += 1
            if len(batch) >= 500:
                db.add_all(batch)
                db.commit()
                batch = []
        if batch:
            db.add_all(batch)
            db.commit()

    log = ScrapeLog(source="data_jobs.csv", records_added=count, status="success")
    db.add(log)
    db.commit()
    return {"message": f"Imported {count} jobs from data_jobs.csv"}


@app.post("/admin/import-jobs-azure", status_code=201)
def import_jobs_azure(
    limit: int = Query(5000, ge=0, le=200000, description="Max postings to import (0 = all ~159k)"),
    replace: bool = Query(False, description="Delete existing Azure-sourced jobs before importing"),
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Import job offers from the Azure SQL **Jobs_DW** data warehouse into the jobs table."""
    from .azure_jobs import azure_configured, import_azure_jobs

    if not azure_configured():
        raise HTTPException(
            status_code=400,
            detail="Azure SQL is not configured. Set AZURE_SQL_SERVER/DB/USER/PASSWORD env vars.",
        )
    try:
        count = import_azure_jobs(db, limit=(None if limit == 0 else limit), replace=replace)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Azure import failed: {e}")

    log = ScrapeLog(source="azure_dw", records_added=count, status="success")
    db.add(log)
    db.commit()
    return {"message": f"Imported {count} jobs from Azure SQL (Jobs_DW).", "source": "azure_dw"}


@app.post("/admin/import-scraper-output", status_code=201)
def import_scraper_output(
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Import scraper/jobs_output_final.csv into jobs table."""
    csv_path = Path(__file__).resolve().parents[1] / "scraper" / "jobs_output_final.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="scraper/jobs_output_final.csv not found")

    count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch = []
        for row in reader:
            posted = None
            if row.get("job_posted_date"):
                try:
                    posted = datetime.strptime(row["job_posted_date"][:19], "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    pass
            job = Job(
                title_short=row.get("job_title_short") or None,
                title=row.get("job_title", "Unknown"),
                location=row.get("job_location") or None,
                via=row.get("job_via") or None,
                schedule_type=row.get("job_schedule_type") or None,
                work_from_home=row.get("job_work_from_home", "").upper() == "TRUE",
                country=row.get("job_country") or None,
                posted_date=posted,
                no_degree_mention=row.get("job_no_degree_mention", "").upper() == "TRUE",
                health_insurance=row.get("job_health_insurance", "").upper() == "TRUE",
                salary_rate=row.get("salary_rate") or None,
                salary_year_avg=float(row["salary_year_avg"]) if row.get("salary_year_avg") else None,
                salary_hour_avg=float(row["salary_hour_avg"]) if row.get("salary_hour_avg") else None,
                company_name=row.get("company_name") or None,
                skills=row.get("job_skills") or None,
                skills_typed=row.get("job_type_skills") or None,
                source="scraper",
                job_url=row.get("job_url") or None,
            )
            batch.append(job)
            count += 1
            if len(batch) >= 500:
                db.add_all(batch)
                db.commit()
                batch = []
        if batch:
            db.add_all(batch)
            db.commit()

    log = ScrapeLog(source="scraper_output", records_added=count, status="success")
    db.add(log)
    db.commit()
    return {"message": f"Imported {count} jobs from scraper output"}


# ╔══════════════════════════════════════════════════════════════╗
# ║              RECRUITER JOB POSTS                             ║
# ╚══════════════════════════════════════════════════════════════╝


@app.post("/recruiter/posts", response_model=RecruiterPostOut, status_code=201)
def create_recruiter_post(
    body: RecruiterPostCreate,
    user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
) -> RecruiterPostOut:
    post = RecruiterJobPost(
        user_id=user.id,
        title=body.title,
        description=body.description,
        category=body.category,
        location=body.location,
        salary_min=body.salary_min,
        salary_max=body.salary_max,
        required_skills=body.required_skills,
        company_name=body.company_name or user.company,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return RecruiterPostOut.model_validate(post)


@app.get("/recruiter/posts", response_model=list[RecruiterPostOut])
def list_recruiter_posts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RecruiterPostOut]:
    if user.role == "admin":
        posts = db.query(RecruiterJobPost).order_by(RecruiterJobPost.created_at.desc()).all()
    else:
        posts = db.query(RecruiterJobPost).filter(
            RecruiterJobPost.user_id == user.id
        ).order_by(RecruiterJobPost.created_at.desc()).all()
    return [RecruiterPostOut.model_validate(p) for p in posts]


@app.get("/recruiter/posts/{post_id}", response_model=RecruiterPostOut)
def get_recruiter_post(post_id: int, db: Session = Depends(get_db)) -> RecruiterPostOut:
    post = db.get(RecruiterJobPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return RecruiterPostOut.model_validate(post)


@app.delete("/recruiter/posts/{post_id}")
def delete_recruiter_post(
    post_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.get(RecruiterJobPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your post")
    post.is_active = False
    db.commit()
    return {"message": "Post deactivated"}


# ╔══════════════════════════════════════════════════════════════╗
# ║              JOB APPLICATIONS                                ║
# ╚══════════════════════════════════════════════════════════════╝


@app.post("/applications", response_model=ApplicationOut, status_code=201)
def apply_to_job(
    body: ApplicationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationOut:
    """Candidate applies to a recruiter job post or a scraped job."""
    if not body.job_post_id and not body.job_id:
        raise HTTPException(status_code=400, detail="Provide job_post_id or job_id")

    # Check for duplicate application
    existing = db.query(JobApplication).filter(
        JobApplication.user_id == user.id,
        JobApplication.job_post_id == body.job_post_id if body.job_post_id else JobApplication.job_id == body.job_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already applied to this job")

    app_record = JobApplication(
        user_id=user.id,
        job_post_id=body.job_post_id,
        job_id=body.job_id,
        cv_id=body.cv_id,
        cover_letter=body.cover_letter,
    )
    db.add(app_record)
    db.commit()
    db.refresh(app_record)

    # Resolve job title and recruiter info for notifications
    job_title = "Poste #" + str(body.job_post_id or body.job_id)
    company_name = None
    recruiter_user_id = None
    if body.job_post_id:
        post = db.get(RecruiterJobPost, body.job_post_id)
        if post:
            job_title = post.title
            company_name = post.company_name
            recruiter_user_id = post.user_id
    elif body.job_id:
        job = db.get(Job, body.job_id)
        if job:
            job_title = job.title_short or job.title
            company_name = job.company_name

    candidate_name = user.full_name or user.email
    applied_at = app_record.created_at.strftime("%d/%m/%Y à %H:%M")

    # Notify recruiter (if job post belongs to a recruiter)
    if recruiter_user_id:
        db.add(Notification(
            user_id=recruiter_user_id,
            type="application_received",
            title=f"Nouvelle candidature — {job_title}",
            message=(
                f"{candidate_name} a postulé pour le poste «\u202f{job_title}\u202f» "
                f"le {applied_at}."
            ),
            data=json.dumps({
                "application_id": app_record.id,
                "job_post_id": body.job_post_id,
                "candidate_name": candidate_name,
                "candidate_email": user.email,
                "job_title": job_title,
            }),
        ))

    # Confirm to candidate
    db.add(Notification(
        user_id=user.id,
        type="application_confirmed",
        title=f"Candidature envoyée — {job_title}",
        message=(
            f"Votre candidature pour «\u202f{job_title}\u202f»"
            + (f" chez {company_name}" if company_name else "")
            + " a bien été reçue. Vous serez notifié(e) dès qu'un recruteur examine votre dossier."
        ),
        data=json.dumps({
            "application_id": app_record.id,
            "job_title": job_title,
            "company_name": company_name,
        }),
    ))

    db.commit()
    return ApplicationOut.model_validate(app_record)


@app.get("/applications", response_model=list[ApplicationOut])
def list_my_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ApplicationOut]:
    apps = db.query(JobApplication).filter(
        JobApplication.user_id == user.id
    ).order_by(JobApplication.created_at.desc()).all()
    return [ApplicationOut.model_validate(a) for a in apps]


@app.get("/recruiter/posts/{post_id}/applications", response_model=list[ApplicationOut])
def list_post_applications(
    post_id: int,
    user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
) -> list[ApplicationOut]:
    post = db.get(RecruiterJobPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your post")
    apps = db.query(JobApplication).filter(
        JobApplication.job_post_id == post_id
    ).order_by(JobApplication.created_at.desc()).all()
    return [ApplicationOut.model_validate(a) for a in apps]


@app.patch("/applications/{app_id}/status")
def update_application_status(
    app_id: int,
    body: ApplicationStatusUpdate,
    user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Recruiter accepts or rejects a candidate — triggers a notification."""
    application = db.get(JobApplication, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    valid_statuses = {"pending", "reviewed", "accepted", "rejected"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    application.status = body.status

    # Persist recruiter response details
    if body.meeting_type:
        application.meeting_type = body.meeting_type
    if body.meeting_slots:
        application.meeting_slots = json.dumps(body.meeting_slots)
    if body.meeting_link:
        application.meeting_link = body.meeting_link
    if body.meeting_location:
        application.meeting_location = body.meeting_location
    if body.recruiter_contact:
        application.recruiter_contact = body.recruiter_contact
    if body.preparation_notes:
        application.preparation_notes = body.preparation_notes
    if body.rejection_reason:
        application.rejection_reason = body.rejection_reason

    # Resolve job title for notification
    job_title = "votre candidature"
    company_name = None
    if application.job_post_id:
        post = db.get(RecruiterJobPost, application.job_post_id)
        if post:
            job_title = post.title
            company_name = post.company_name or user.company
    recruiter_name = user.full_name or user.company or user.email

    # Send notification to candidate
    if body.status == "accepted":
        slots_text = ""
        if body.meeting_slots:
            slots_text = " Créneaux proposés\u00a0: " + ", ".join(body.meeting_slots) + "."
        meeting_info = ""
        if body.meeting_type:
            type_labels = {"video": "Appel vidéo", "phone": "Appel téléphonique", "in-person": "Entretien en présentiel"}
            meeting_info = f" Format\u00a0: {type_labels.get(body.meeting_type, body.meeting_type)}."
        link_info = f" Lien\u00a0: {body.meeting_link}." if body.meeting_link else ""
        location_info = f" Lieu\u00a0: {body.meeting_location}." if body.meeting_location else ""
        contact_info = f" Contact\u00a0: {body.recruiter_contact}." if body.recruiter_contact else ""
        prep_info = f" Préparation\u00a0: {body.preparation_notes}" if body.preparation_notes else ""

        db.add(Notification(
            user_id=application.user_id,
            type="accepted",
            title=f"🎉 Félicitations — Votre candidature a été retenue\u00a0!",
            message=(
                f"Bonne nouvelle\u00a0! {recruiter_name}"
                + (f" ({company_name})" if company_name else "")
                + f" a examiné votre candidature pour «\u202f{job_title}\u202f» et souhaite vous rencontrer."
                + meeting_info + slots_text + link_info + location_info + contact_info + prep_info
            ),
            data=json.dumps({
                "application_id": app_id,
                "job_title": job_title,
                "meeting_type": body.meeting_type,
                "meeting_slots": body.meeting_slots,
                "meeting_link": body.meeting_link,
                "meeting_location": body.meeting_location,
                "recruiter_contact": body.recruiter_contact,
                "preparation_notes": body.preparation_notes,
            }),
        ))
    elif body.status == "rejected":
        reason_text = f" {body.rejection_reason}" if body.rejection_reason else ""
        db.add(Notification(
            user_id=application.user_id,
            type="rejected",
            title=f"Candidature pour «\u202f{job_title}\u202f»",
            message=(
                f"Après examen attentif de votre dossier, {recruiter_name}"
                + (f" ({company_name})" if company_name else "")
                + f" ne donnera pas suite à votre candidature pour «\u202f{job_title}\u202f»."
                + reason_text
                + " Nous vous encourageons à consulter d'autres offres sur notre plateforme."
            ),
            data=json.dumps({
                "application_id": app_id,
                "job_title": job_title,
                "rejection_reason": body.rejection_reason,
            }),
        ))

    db.commit()
    return {"message": f"Application {app_id} updated to '{body.status}'", "status": body.status}


# ╔══════════════════════════════════════════════════════════════╗
# ║              CANDIDATE PORTAL                                ║
# ╚══════════════════════════════════════════════════════════════╝


@app.get("/candidate/applications", response_model=list[ApplicationDetailOut])
def candidate_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ApplicationDetailOut]:
    """Return current user's applications enriched with job title and company."""
    apps = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == user.id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )
    result = []
    for a in apps:
        job_title = None
        company = None
        location = None
        if a.job_post_id:
            post = db.get(RecruiterJobPost, a.job_post_id)
            if post:
                job_title = post.title
                location = post.location
        elif a.job_id:
            job = db.get(Job, a.job_id)
            if job:
                job_title = job.title_short or job.title
                company = job.company_name
                location = job.location
        result.append(ApplicationDetailOut(
            id=a.id,
            user_id=a.user_id,
            job_post_id=a.job_post_id,
            job_id=a.job_id,
            cv_id=a.cv_id,
            status=a.status,
            cover_letter=a.cover_letter,
            created_at=a.created_at,
            updated_at=a.updated_at,
            job_title=job_title,
            company_name=company,
            job_location=location,
            meeting_type=a.meeting_type,
            meeting_slots=json.loads(a.meeting_slots) if a.meeting_slots else None,
            meeting_link=a.meeting_link,
            meeting_location=a.meeting_location,
            recruiter_contact=a.recruiter_contact,
            preparation_notes=a.preparation_notes,
            rejection_reason=a.rejection_reason,
        ))
    return result


@app.get("/candidate/cv-history", response_model=list[CVHistoryOut])
def candidate_cv_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CVHistoryOut]:
    """Return all CV analyses linked to the current user account."""
    cvs = (
        db.query(CandidateCV)
        .filter(CandidateCV.user_id == user.id)
        .order_by(CandidateCV.created_at.desc())
        .all()
    )
    return [CVHistoryOut.model_validate(c) for c in cvs]


# ╔══════════════════════════════════════════════════════════════╗
# ║              NOTIFICATIONS                                   ║
# ╚══════════════════════════════════════════════════════════════╝


@app.get("/notifications", response_model=list[NotificationOut])
def get_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NotificationOut]:
    """Return all notifications for the current user, newest first."""
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for n in notifs:
        d = None
        if n.data:
            try:
                d = json.loads(n.data)
            except Exception:
                d = None
        result.append(NotificationOut(
            id=n.id, user_id=n.user_id, type=n.type,
            title=n.title, message=n.message,
            data=d, is_read=n.is_read, created_at=n.created_at,
        ))
    return result


@app.get("/notifications/unread-count")
def unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,  # noqa: E712
    ).count()
    return {"count": count}


@app.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    notif = db.get(Notification, notif_id)
    if not notif or notif.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"id": notif_id, "is_read": True}


@app.post("/notifications/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


# ── Enriched application detail (recruiter view) ──────────────

def _build_ai_analysis(cv: "CandidateCV | None", required_skills_str: str | None) -> dict:
    """Compute skill gap, experience level, strengths, red flags from CV data."""
    if not cv:
        return {}

    candidate_skills = [s.strip().lower() for s in (cv.skills or "").split(",") if s.strip()]
    required_skills = [s.strip().lower() for s in (required_skills_str or "").split(",") if s.strip()]

    matched = [s for s in required_skills if any(s in cs or cs in s for cs in candidate_skills)]
    missing = [s for s in required_skills if s not in matched]

    match_score = round((cv.hire_probability or 0) * 100, 1)

    exp = cv.experience_years or 0
    if exp < 2:
        exp_level = "Junior"
    elif exp < 5:
        exp_level = "Mid-level"
    else:
        exp_level = "Senior"

    strengths = []
    if (cv.hire_probability or 0) >= 0.7:
        strengths.append(f"Forte probabilité d'embauche ({match_score:.0f}%)")
    if matched:
        strengths.append(f"Compétences clés maîtrisées\u00a0: {', '.join(matched[:3])}")
    if exp >= 3:
        strengths.append(f"{exp:.0f} ans d'expérience professionnelle")
    if cv.certifications:
        strengths.append(f"Certifications\u00a0: {cv.certifications[:60]}")
    if cv.projects_count and cv.projects_count >= 3:
        strengths.append(f"{cv.projects_count} projets réalisés")

    red_flags = []
    if (cv.ai_score or 0) < 50:
        red_flags.append(f"Score IA faible ({cv.ai_score:.0f}/100)")
    if missing:
        red_flags.append(f"Compétences manquantes\u00a0: {', '.join(missing[:3])}")
    if exp < 1:
        red_flags.append("Très peu d'expérience déclarée")

    if match_score >= 70:
        ai_rec = "Shortlist"
    elif match_score >= 50:
        ai_rec = "Maybe"
    else:
        ai_rec = "Pass"

    return {
        "match_score": match_score,
        "matched_skills": matched,
        "missing_skills": missing,
        "experience_level": exp_level,
        "strengths": strengths[:3],
        "red_flags": red_flags,
        "ai_recommendation": ai_rec,
    }


@app.get("/recruiter/applications/{app_id}/detail", response_model=ApplicationFullOut)
def application_full_detail(
    app_id: int,
    user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
) -> ApplicationFullOut:
    """Return enriched application detail including AI analysis for the recruiter."""
    application = db.get(JobApplication, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Resolve job info
    job_title = None
    company_name = None
    job_location = None
    required_skills = None
    if application.job_post_id:
        post = db.get(RecruiterJobPost, application.job_post_id)
        if post:
            job_title = post.title
            company_name = post.company_name
            job_location = post.location
            required_skills = post.required_skills
            # Verify recruiter owns the post
            if post.user_id != user.id and user.role != "admin":
                raise HTTPException(status_code=403, detail="Not your post")

    # Candidate info
    applicant = db.get(User, application.user_id)
    cv = db.get(CandidateCV, application.cv_id) if application.cv_id else None

    # Try to find CV by user if not directly linked
    if not cv and application.user_id:
        cv = (
            db.query(CandidateCV)
            .filter(CandidateCV.user_id == application.user_id)
            .order_by(CandidateCV.created_at.desc())
            .first()
        )

    ai = _build_ai_analysis(cv, required_skills)

    meeting_slots = None
    if application.meeting_slots:
        try:
            meeting_slots = json.loads(application.meeting_slots)
        except Exception:
            meeting_slots = [application.meeting_slots]

    return ApplicationFullOut(
        id=application.id,
        user_id=application.user_id,
        job_post_id=application.job_post_id,
        job_id=application.job_id,
        cv_id=application.cv_id,
        status=application.status,
        cover_letter=application.cover_letter,
        created_at=application.created_at,
        updated_at=application.updated_at,
        job_title=job_title,
        company_name=company_name,
        job_location=job_location,
        required_skills=required_skills,
        candidate_name=applicant.full_name if applicant else None,
        candidate_email=applicant.email if applicant else None,
        candidate_phone=applicant.phone if hasattr(applicant, "phone") else None,
        cv_skills=[s.strip() for s in (cv.skills or "").split(",") if s.strip()] if cv else None,
        cv_education=cv.education if cv else None,
        cv_experience_years=cv.experience_years if cv else None,
        cv_projects_count=cv.projects_count if cv else None,
        cv_certifications=cv.certifications if cv else None,
        hire_probability=cv.hire_probability if cv else None,
        predicted_salary=cv.predicted_salary if cv else None,
        candidate_cluster=cv.candidate_cluster if cv else None,
        recommendation=cv.recommendation if cv else None,
        match_score=ai.get("match_score"),
        matched_skills=ai.get("matched_skills"),
        missing_skills=ai.get("missing_skills"),
        experience_level=ai.get("experience_level"),
        strengths=ai.get("strengths"),
        red_flags=ai.get("red_flags"),
        ai_recommendation=ai.get("ai_recommendation"),
        meeting_type=application.meeting_type,
        meeting_slots=meeting_slots,
        meeting_link=application.meeting_link,
        meeting_location=application.meeting_location,
        recruiter_contact=application.recruiter_contact,
        preparation_notes=application.preparation_notes,
        rejection_reason=application.rejection_reason,
    )



# ╔══════════════════════════════════════════════════════════════╗
# ║              ADMIN SCRAPE TRIGGER                            ║
# ╚══════════════════════════════════════════════════════════════╝


@app.post("/admin/scrape", status_code=202)
def trigger_scrape(
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Trigger the job scraper and import results into DB."""
    # Try multiple paths for the scraper
    possible_paths = [
        Path("/app/scraper/job_scraper_final.py"),  # Docker mount
        Path(__file__).resolve().parents[2] / "scraper" / "job_scraper_final.py",  # Local dev
        Path.cwd() / "scraper" / "job_scraper_final.py",  # Current working dir
    ]

    scraper_path = None
    scraper_dir = None

    for path in possible_paths:
        if path.exists():
            scraper_path = path
            scraper_dir = path.parent
            break

    if not scraper_path:
        available_paths = ", ".join(str(p) for p in possible_paths)
        raise HTTPException(
            status_code=501,
            detail="Scraper not available in this environment. Expected at one of: " + available_paths
        )

    output_path = scraper_dir / "jobs_output_final.csv"

    import subprocess
    log = ScrapeLog(source="admin_trigger", status="running")
    db.add(log)
    db.commit()

    try:
        result = subprocess.run(
            ["python", str(scraper_path)],
            capture_output=True, text=True, timeout=300,
            cwd=str(scraper_path.parent),
        )
        if result.returncode != 0:
            log.status = "error"
            log.error_message = result.stderr[:1000]
            db.commit()
            return {"status": "error", "detail": result.stderr[:500]}

        # Import the output
        if output_path.exists():
            count = 0
            with open(output_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                batch = []
                for row in reader:
                    posted = None
                    if row.get("job_posted_date"):
                        try:
                            posted = datetime.strptime(row["job_posted_date"][:19], "%Y-%m-%d %H:%M:%S")
                        except ValueError:
                            pass
                    job = Job(
                        title_short=row.get("job_title_short") or None,
                        title=row.get("job_title", "Unknown"),
                        location=row.get("job_location") or None,
                        via=row.get("job_via") or None,
                        schedule_type=row.get("job_schedule_type") or None,
                        work_from_home=row.get("job_work_from_home", "").upper() == "TRUE",
                        country=row.get("job_country") or None,
                        posted_date=posted,
                        no_degree_mention=row.get("job_no_degree_mention", "").upper() == "TRUE",
                        health_insurance=row.get("job_health_insurance", "").upper() == "TRUE",
                        salary_rate=row.get("salary_rate") or None,
                        salary_year_avg=float(row["salary_year_avg"]) if row.get("salary_year_avg") else None,
                        salary_hour_avg=float(row["salary_hour_avg"]) if row.get("salary_hour_avg") else None,
                        company_name=row.get("company_name") or None,
                        skills=row.get("job_skills") or None,
                        skills_typed=row.get("job_type_skills") or None,
                        source="scraper",
                        job_url=row.get("job_url") or None,
                    )
                    batch.append(job)
                    count += 1
                    if len(batch) >= 500:
                        db.add_all(batch)
                        db.commit()
                        batch = []
                if batch:
                    db.add_all(batch)
                    db.commit()

            log.status = "success"
            log.records_added = count
            db.commit()
            return {"status": "success", "jobs_scraped": count}
        else:
            log.status = "warning"
            log.error_message = "Scraper ran but no output CSV found"
            db.commit()
            return {"status": "warning", "detail": "Scraper ran but no output file found"}

    except subprocess.TimeoutExpired:
        log.status = "timeout"
        log.error_message = "Scraper timed out after 300s"
        db.commit()
        return {"status": "error", "detail": "Scraper timed out"}
    except Exception as e:
        log.status = "error"
        log.error_message = str(e)[:1000]
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/scrape-logs")
def get_scrape_logs(
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> list[dict]:
    logs = db.query(ScrapeLog).order_by(ScrapeLog.scraped_at.desc()).limit(20).all()
    return [
        {
            "id": l.id, "source": l.source, "records_added": l.records_added,
            "status": l.status, "error_message": l.error_message,
            "scraped_at": l.scraped_at.isoformat() if l.scraped_at else None,
        }
        for l in logs
    ]


# ╔══════════════════════════════════════════════════════════════╗
# ║              JOB RECOMMENDATIONS FROM CV                     ║
# ╚══════════════════════════════════════════════════════════════╝


@app.get("/cvs/{cv_id}/recommendations")
def cv_job_recommendations(
    cv_id: int,
    top_n: int = Query(default=5, ge=1, le=10),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Return top-N real job recommendations from the DB for a given CV analysis."""
    candidate = db.get(CandidateCV, cv_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="CV not found")

    # Build a combined text from the candidate's profile for semantic matching
    skills_text = candidate.skills or ""
    role_text = candidate.job_role or ""
    edu_text = candidate.education or ""
    profile_text = f"{role_text} {skills_text} {edu_text} {candidate.certifications or ''}"

    # Try v2 (real job vectors from scraped + dataset jobs)
    try:
        recs = recommend_jobs_v2(profile_text, BASE_DIR / "models", top_n=top_n)
        if recs:
            return [dict(r) for r in recs]
    except Exception:
        pass

    # Fallback: keyword-based DB search using candidate skills and role
    skill_list = [s.strip() for s in skills_text.split(",") if s.strip()][:5]
    q = select(Job).order_by(Job.salary_year_avg.desc().nullslast())

    if role_text:
        like = f"%{role_text.split()[0]}%" if role_text else "%"
        q = q.where(or_(Job.title.ilike(like), Job.title_short.ilike(like)))
    elif skill_list:
        q = q.where(Job.skills.ilike(f"%{skill_list[0]}%"))

    jobs = db.execute(q.limit(top_n)).scalars().all()

    return [
        {
            "rank": i + 1,
            "job_title": j.title_short or j.title,
            "company": j.company_name or "Unknown",
            "location": j.location or "Remote",
            "salary_avg": j.salary_year_avg,
            "skills": j.skills or "",
            "similarity_score": 0.5,
            "source": j.source,
            "job_id": j.id,
        }
        for i, j in enumerate(jobs)
    ]


# ╔══════════════════════════════════════════════════════════════╗
# ║              RECRUITER PORTAL ENDPOINTS                      ║
# ╚══════════════════════════════════════════════════════════════╝


@app.get("/recruiter/my-posts", response_model=list[RecruiterPostOut])
def my_posts(
    user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
) -> list[RecruiterPostOut]:
    """Return recruiter's own job posts ordered newest first."""
    posts = (
        db.query(RecruiterJobPost)
        .filter(RecruiterJobPost.user_id == user.id)
        .order_by(RecruiterJobPost.created_at.desc())
        .all()
    )
    # Count applications per post in one grouped query
    post_ids = [p.id for p in posts]
    counts: dict[int, int] = {}
    if post_ids:
        rows = (
            db.query(JobApplication.job_post_id, func.count(JobApplication.id))
            .filter(JobApplication.job_post_id.in_(post_ids))
            .group_by(JobApplication.job_post_id)
            .all()
        )
        counts = {pid: cnt for pid, cnt in rows}
    result = []
    for p in posts:
        out = RecruiterPostOut.model_validate(p)
        out.applications_count = counts.get(p.id, 0)
        result.append(out)
    return result


@app.patch("/recruiter/posts/{post_id}/toggle")
def toggle_post_active(
    post_id: int,
    user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Open or close a recruiter job post."""
    post = db.get(RecruiterJobPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your post")
    post.is_active = not post.is_active
    db.commit()
    return {"post_id": post_id, "is_active": post.is_active}


@app.get("/recruiter/posts/{post_id}/candidates")
def post_candidates(
    post_id: int,
    user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Return applicants for a post with their CV details."""
    post = db.get(RecruiterJobPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your post")

    apps = (
        db.query(JobApplication)
        .filter(JobApplication.job_post_id == post_id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )
    result = []
    for a in apps:
        applicant = db.get(User, a.user_id)
        cv = db.get(CandidateCV, a.cv_id) if a.cv_id else None
        result.append({
            "application_id": a.id,
            "status": a.status,
            "applied_at": a.created_at.isoformat(),
            "cover_letter": a.cover_letter,
            "applicant": {
                "id": applicant.id if applicant else None,
                "name": applicant.full_name if applicant else "Unknown",
                "email": applicant.email if applicant else "?",
            },
            "cv": {
                "id": cv.id if cv else None,
                "job_role": cv.job_role if cv else None,
                "experience_years": cv.experience_years if cv else None,
                "hire_probability": cv.hire_probability if cv else None,
                "predicted_salary": cv.predicted_salary if cv else None,
                "skills": cv.skills if cv else None,
                "education": cv.education if cv else None,
            } if cv else None,
        })
    return result


@app.post("/recruiter/posts/{post_id}/hire/{application_id}")
def hire_applicant(
    post_id: int,
    application_id: int,
    user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Hire a candidate: accept their application and close the post."""
    post = db.get(RecruiterJobPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your post")

    application = db.get(JobApplication, application_id)
    if not application or application.job_post_id != post_id:
        raise HTTPException(status_code=404, detail="Application not found for this post")

    # Mark the hired application as accepted
    application.status = "accepted"
    # Reject all other pending applications for this post
    db.query(JobApplication).filter(
        JobApplication.job_post_id == post_id,
        JobApplication.id != application_id,
        JobApplication.status == "pending",
    ).update({"status": "rejected"})
    # Close the post
    post.is_active = False
    db.commit()

    hired_user = db.get(User, application.user_id)
    return {
        "message": f"Hired {hired_user.full_name or hired_user.email}. Post closed.",
        "application_id": application_id,
        "hired_user_email": hired_user.email if hired_user else None,
        "post_closed": True,
    }


# ╔══════════════════════════════════════════════════════════════╗
# ║              ADMIN — COMPANY / USER MANAGEMENT               ║
# ╚══════════════════════════════════════════════════════════════╝


@app.get("/admin/companies")
def list_companies(
    user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> list[dict]:
    """List all recruiters and their companies."""
    recruiters = db.query(User).filter(User.role == "recruiter").all()
    result = []
    for r in recruiters:
        post_count = db.query(RecruiterJobPost).filter(RecruiterJobPost.user_id == r.id).count()
        result.append({
            "id": r.id,
            "email": r.email,
            "full_name": r.full_name,
            "company": r.company,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat(),
            "post_count": post_count,
        })
    return result


@app.patch("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    new_role: str = Query(..., pattern="^(candidate|recruiter|admin)$"),
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> dict:
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = new_role
    db.commit()
    return {"user_id": user_id, "new_role": new_role}


@app.patch("/admin/users/{user_id}/activate")
def activate_user(
    user_id: int,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> dict:
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = True
    db.commit()
    return {"user_id": user_id, "is_active": True}


# ╔══════════════════════════════════════════════════════════════╗
# ║ Chatbot — Fallback when n8n is not deployed                 ║
# ╚══════════════════════════════════════════════════════════════╝

DEFAULT_CHATBOT_RESPONSES = {
    "bonjour": "Bonjour! Je suis l'assistant CVerify. Bienvenue!\n\nComment puis-je vous aider?\n\n📋 Analyse CV\n💼 Recommandations d'emploi\n❓ Questions sur CVerify",
    "analyse": "Notre système utilise 6 modèles ML entraînés:\n\n✅ **Prédiction d'embauche** - Précision 100%\n✅ **Prédiction de salaire** - MAE: $21,106\n✅ **Classification des rôles** - 24 catégories, F1: 75.5%\n✅ **Recommandation d'emplois** - TF-IDF + Jaccard sur 20k+ postes\n\nVisitez https://cverify-frontend.onrender.com pour tester!",
    "emploi": "CVerify recommande des emplois basés sur:\n✅ Vos compétences extraites du CV\n✅ Votre expérience professionnelle\n✅ Votre domaine de spécialité (24 catégories)\n✅ Similarité avec 20,414 offres d'emploi réelles\n\nTentez maintenant: https://cverify-frontend.onrender.com",
    "features": "Fonctionnalités principales de CVerify:\n\n✨ Parsing CV automatique\n🤖 ML Scoring (embauche, salaire)\n💼 Matching d'emplois intelligent\n📊 Dashboards (candidats & recruteurs)\n🔔 Notifications en temps réel\n📈 Analytics Power BI",
    "aide": "Je suis en mode démo. Voici ce que vous pouvez me demander:\n\n• Bonjour / Salut\n• Analyse / Modèles / ML\n• Emploi / Job / Offres\n• Features / Capacités\n\nPour plus d'aide, visitez https://cverify-frontend.onrender.com",
    "default": "Je suis actuellement en mode démo avec des réponses pré-définies.\n\nPour une assistance complète, visitez https://cverify-frontend.onrender.com ou contactez notre équipe."
}


def get_chatbot_response(user_message: str) -> str:
    msg = user_message.lower().strip()
    for keyword, response in DEFAULT_CHATBOT_RESPONSES.items():
        if keyword in msg:
            return response
    return DEFAULT_CHATBOT_RESPONSES["default"]


@app.post("/webhook/chatbot")
async def chatbot_webhook(data: dict) -> dict:
    """Chatbot webhook — Returns default responses when n8n is not deployed."""
    user_message = data.get("message", data.get("text", ""))
    response = get_chatbot_response(user_message)
    return {
        "message": response,
        "data": {
            "reply": response
        }
    }


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint for Docker container."""
    return {"status": "healthy"}