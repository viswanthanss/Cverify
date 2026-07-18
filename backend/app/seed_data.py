"""seed_data.py — Pre-populate the SQLite DB with realistic sample candidates."""
from __future__ import annotations

import json
from datetime import datetime, timedelta


SEED_CANDIDATES = [
    {
        "full_name": "Amine Cherif", "email": "amine.cherif@email.com", "phone": "+33 6 88 99 00 11",
        "education": "Ph.D", "job_role": "INFORMATION-TECHNOLOGY", "experience_years": 14.0,
        "projects_count": 25, "ai_score": 97.0,
        "skills": "Machine Learning, Deep Learning, TensorFlow, PyTorch, Python, Data Science, NLP",
        "certifications": "Google Cloud Professional ML Engineer",
        "hire_probability": 0.98, "predicted_salary": 140000.0,
        "candidate_cluster": 0, "recommendation": "Top priority — 98% match. AI/ML expert. Schedule interview immediately.",
    },
    {
        "full_name": "Sophie Dubois", "email": "sophie.dubois@email.com", "phone": "+33 6 55 44 33 22",
        "education": "MBA", "job_role": "FINANCE", "experience_years": 9.0,
        "projects_count": 7, "ai_score": 88.0,
        "skills": "Finance, Investment, Portfolio, Excel, Tableau, Financial Reporting",
        "certifications": "CFA Level 2",
        "hire_probability": 0.87, "predicted_salary": 84000.0,
        "candidate_cluster": 0, "recommendation": "Top priority — 87% match. Senior finance profile.",
    },
    {
        "full_name": "Mohamed Ait Yahia", "email": "m.aityahia@email.com", "phone": "+33 6 11 22 33 44",
        "education": "Ph.D", "job_role": "HEALTHCARE", "experience_years": 11.0,
        "projects_count": 20, "ai_score": 94.0,
        "skills": "Patient Care, Clinical Research, Surgery, EMR, Diagnosis, Pharmacy",
        "certifications": "Board Certified Physician",
        "hire_probability": 0.96, "predicted_salary": 120000.0,
        "candidate_cluster": 0, "recommendation": "Top priority — 96% match. Highly experienced clinician.",
    },
    {
        "full_name": "Rayan Hadjadj", "email": "rayan.hadjadj@email.com", "phone": "+33 7 44 55 66 77",
        "education": "MBA", "job_role": "BUSINESS-DEVELOPMENT", "experience_years": 8.0,
        "projects_count": 11, "ai_score": 86.0,
        "skills": "Strategy, Business Development, Growth, Leadership, Marketing, CRM",
        "certifications": "PMP, Six Sigma Green Belt",
        "hire_probability": 0.89, "predicted_salary": 78000.0,
        "candidate_cluster": 0, "recommendation": "Top priority — 89% match. Senior business leader.",
    },
    {
        "full_name": "Alice Martin", "email": "alice.martin@email.com", "phone": "+33 6 12 34 56 78",
        "education": "M.Sc", "job_role": "INFORMATION-TECHNOLOGY", "experience_years": 6.0,
        "projects_count": 12, "ai_score": 82.0,
        "skills": "Python, FastAPI, Docker, PostgreSQL, Machine Learning, REST API",
        "certifications": "AWS Certified Developer",
        "hire_probability": 0.91, "predicted_salary": 68000.0,
        "candidate_cluster": 1, "recommendation": "Top priority — 91% match. Strong backend engineer.",
    },
    {
        "full_name": "Lucas Bernard", "email": "lucas.bernard@email.com", "phone": "+33 6 77 88 99 00",
        "education": "M.Sc", "job_role": "ENGINEERING", "experience_years": 5.0,
        "projects_count": 9, "ai_score": 79.0,
        "skills": "AutoCAD, Civil Engineering, Structural, Construction, MATLAB",
        "certifications": "PMP",
        "hire_probability": 0.81, "predicted_salary": 62000.0,
        "candidate_cluster": 1, "recommendation": "Strong fit — 81% match. Mid-level civil engineer.",
    },
    {
        "full_name": "Fatima El Amrani", "email": "f.elamrani@email.com", "phone": "+33 6 33 44 55 66",
        "education": "M.Sc", "job_role": "HR", "experience_years": 7.0,
        "projects_count": 6, "ai_score": 75.0,
        "skills": "Human Resources, Recruitment, Payroll, Talent, HRIS",
        "certifications": "SHRM-CP",
        "hire_probability": 0.78, "predicted_salary": 55000.0,
        "candidate_cluster": 1, "recommendation": "Strong fit — 78% match. Experienced HR manager.",
    },
    {
        "full_name": "Nora Benali", "email": "nora.benali@email.com", "phone": "+33 7 11 22 33 44",
        "education": "M.Sc", "job_role": "BANKING", "experience_years": 5.0,
        "projects_count": 6, "ai_score": 77.0,
        "skills": "Banking, Finance, Investment, Compliance, Risk Management",
        "certifications": "Series 7",
        "hire_probability": 0.79, "predicted_salary": 66000.0,
        "candidate_cluster": 1, "recommendation": "Strong fit — 79% match. Mid-level banking analyst.",
    },
    {
        "full_name": "Sami Boutaleb", "email": "sami.boutaleb@email.com", "phone": "+33 6 00 11 22 33",
        "education": "B.Sc", "job_role": "CHEF", "experience_years": 8.0,
        "projects_count": 3, "ai_score": 80.0,
        "skills": "Cooking, Menu Planning, Food Safety, Catering, Baking",
        "certifications": "ServSafe Food Manager",
        "hire_probability": 0.84, "predicted_salary": 52000.0,
        "candidate_cluster": 1, "recommendation": "Strong fit — 84% match. Experienced head chef.",
    },
    {
        "full_name": "Emma Lefevre", "email": "emma.lefevre@email.com", "phone": None,
        "education": "B.Sc", "job_role": "DESIGNER", "experience_years": 3.0,
        "projects_count": 8, "ai_score": 70.0,
        "skills": "Figma, Photoshop, Illustrator, UI/UX, Adobe XD, Graphic Design",
        "certifications": None,
        "hire_probability": 0.73, "predicted_salary": 47000.0,
        "candidate_cluster": 2, "recommendation": "Strong fit — 73% match. Creative designer.",
    },
    {
        "full_name": "Claire Rousseau", "email": "claire.rousseau@email.com", "phone": None,
        "education": "B.Sc", "job_role": "TEACHER", "experience_years": 6.0,
        "projects_count": 4, "ai_score": 72.0,
        "skills": "Teaching, Curriculum, Lesson Planning, Education, Tutoring",
        "certifications": "CELTA",
        "hire_probability": 0.74, "predicted_salary": 44000.0,
        "candidate_cluster": 2, "recommendation": "Strong fit — 74% match. Experienced educator.",
    },
    {
        "full_name": "Isabelle Garnier", "email": "i.garnier@email.com", "phone": "+33 6 66 77 88 99",
        "education": "B.Sc", "job_role": "SALES", "experience_years": 4.0,
        "projects_count": 5, "ai_score": 68.0,
        "skills": "Sales, CRM, Salesforce, Negotiation, Communication",
        "certifications": None,
        "hire_probability": 0.69, "predicted_salary": 50000.0,
        "candidate_cluster": 2, "recommendation": "Strong fit — 69% match. Sales executive profile.",
    },
    {
        "full_name": "Pauline Vidal", "email": "pauline.vidal@email.com", "phone": "+33 7 55 66 77 88",
        "education": "B.Sc", "job_role": "ACCOUNTANT", "experience_years": 3.0,
        "projects_count": 4, "ai_score": 64.0,
        "skills": "Accounting, GAAP, Budgeting, Excel, QuickBooks",
        "certifications": "CPA",
        "hire_probability": 0.67, "predicted_salary": 46000.0,
        "candidate_cluster": 2, "recommendation": "Strong fit — 67% match. Junior accountant with CPA.",
    },
    {
        "full_name": "Karim Bensalem", "email": "k.bensalem@email.com", "phone": "+33 7 98 76 54 32",
        "education": "B.Sc", "job_role": "INFORMATION-TECHNOLOGY", "experience_years": 2.0,
        "projects_count": 5, "ai_score": 61.0,
        "skills": "JavaScript, React, Node.js, HTML, CSS",
        "certifications": None,
        "hire_probability": 0.62, "predicted_salary": 42000.0,
        "candidate_cluster": 2, "recommendation": "Potential fit — 62% match. Junior frontend developer.",
    },
    {
        "full_name": "Thomas Moreau", "email": "t.moreau@email.com", "phone": "+33 7 22 33 44 55",
        "education": "B.Tech", "job_role": "INFORMATION-TECHNOLOGY", "experience_years": 1.5,
        "projects_count": 3, "ai_score": 52.0,
        "skills": "Python, SQL, Git, Linux",
        "certifications": None,
        "hire_probability": 0.41, "predicted_salary": 35000.0,
        "candidate_cluster": 2, "recommendation": "Potential fit — 41% match. Junior developer, needs mentoring.",
    },
]


def seed_database(db) -> int:
    """Insert seed candidates if DB is empty. Returns number of records inserted."""
    from sqlalchemy import select
    from .models import CandidateCV

    existing = db.execute(select(CandidateCV)).first()
    if existing:
        return 0  # already has data, don't overwrite

    base_time = datetime(2026, 1, 15)
    for i, c in enumerate(SEED_CANDIDATES):
        ts = base_time + timedelta(days=i * 2, hours=i % 8)
        candidate = CandidateCV(
            full_name=c["full_name"],
            email=c["email"],
            phone=c["phone"],
            education=c["education"],
            job_role=c["job_role"],
            experience_years=c["experience_years"],
            projects_count=c["projects_count"],
            ai_score=c["ai_score"],
            score_travail_total=c["experience_years"] + c["projects_count"],
            skills=c["skills"],
            certifications=c.get("certifications"),
            hire_probability=c["hire_probability"],
            predicted_salary=c["predicted_salary"],
            candidate_cluster=c["candidate_cluster"],
            recommendation=c["recommendation"],
            raw_payload=json.dumps(c),
            created_at=ts,
            updated_at=ts,
        )
        db.add(candidate)

    db.commit()

    # After seeding candidates, seed recruiter posts
    seed_recruiter_posts(db)

    return len(SEED_CANDIDATES)


# ── Recruiter Posts Seed Data ─────────────────────────────────
SEED_RECRUITER_POSTS = [
    {
        "title": "Ingénieur Machine Learning Senior",
        "company_name": "Esprit",
        "category": "Data Science",
        "location": "Tunis, Tunisie",
        "salary_min": 45000, "salary_max": 70000,
        "required_skills": "Python, TensorFlow, PyTorch, MLOps, Docker",
        "description": "Nous recherchons un ingénieur ML senior pour rejoindre notre équipe IA. Vous concevrez et déploierez des modèles de machine learning en production.",
    },
    {
        "title": "Développeur Full-Stack Python / Angular",
        "company_name": "Esprit",
        "category": "Développement Web",
        "location": "Tunis, Tunisie",
        "salary_min": 35000, "salary_max": 55000,
        "required_skills": "Python, FastAPI, Angular, PostgreSQL, Docker",
        "description": "Poste de développeur full-stack pour contribuer à nos plateformes web. Stack : Python/FastAPI côté backend, Angular côté frontend.",
    },
    {
        "title": "Data Analyst – Business Intelligence",
        "company_name": "Esprit",
        "category": "Data Science",
        "location": "Ariana, Tunisie",
        "salary_min": 30000, "salary_max": 45000,
        "required_skills": "SQL, Power BI, Tableau, Python, Excel",
        "description": "Analyser les données métier et produire des tableaux de bord décisionnels pour la direction.",
    },
    {
        "title": "DevOps Engineer",
        "company_name": "Esprit",
        "category": "DevOps",
        "location": "Remote – Tunisie",
        "salary_min": 40000, "salary_max": 60000,
        "required_skills": "Docker, Kubernetes, CI/CD, AWS, Terraform",
        "description": "Automatiser les pipelines de déploiement et gérer l'infrastructure cloud de nos applications.",
    },
    {
        "title": "Chef de Projet Digital",
        "company_name": "Esprit",
        "category": "Management",
        "location": "Tunis, Tunisie",
        "salary_min": 50000, "salary_max": 75000,
        "required_skills": "Agile, Scrum, Jira, Leadership, Communication",
        "description": "Piloter les projets digitaux de l'entreprise, coordonner les équipes techniques et assurer la livraison dans les délais.",
    },
    {
        "title": "Stagiaire Data Science (PFE)",
        "company_name": "Esprit",
        "category": "Data Science",
        "location": "Tunis, Tunisie",
        "salary_min": 0, "salary_max": 5000,
        "required_skills": "Python, Pandas, Scikit-learn, NLP",
        "description": "Stage de fin d'études en Data Science. Vous travaillerez sur un projet de classification automatique de CVs avec des modèles NLP.",
    },
]


SEED_USERS = [
    {"full_name": "Admin", "email": "admin@cverify.com", "password": "Admin1234!", "role": "admin"},
    {"full_name": "Imed Attia", "email": "imed.attia@esprit.tn", "password": "Esprit2026!", "role": "admin"},
    {"full_name": "Khalil Chiha", "email": "khalil.chiha@esprit.tn", "password": "Esprit2026!", "role": "recruiter", "company": "Esprit"},
    {"full_name": "Zaineb Khlifi", "email": "zaineb.khlifi@esprit.tn", "password": "Esprit2026!", "role": "candidate"},
    {"full_name": "Yessine Mnejja", "email": "yessine.mnejja@esprit.tn", "password": "Esprit2026!", "role": "candidate"},
]


def seed_users(db) -> int:
    """Create seed user accounts. Returns number created."""
    from sqlalchemy import select
    from .auth import hash_password
    from .models import User

    count = 0
    for u in SEED_USERS:
        existing = db.execute(select(User).where(User.email == u["email"])).scalar_one_or_none()
        if existing:
            continue
        user = User(
            full_name=u["full_name"],
            email=u["email"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            company=u.get("company"),
            is_active=True,
        )
        db.add(user)
        count += 1
    db.commit()
    return count


def seed_recruiter_posts(db) -> int:
    """Seed recruiter job posts for the khalil.chiha recruiter account."""
    from sqlalchemy import select
    from .models import User, RecruiterJobPost

    recruiter = db.execute(
        select(User).where(User.email == "khalil.chiha@esprit.tn")
    ).scalars().first()
    if not recruiter:
        return 0

    existing = db.execute(
        select(RecruiterJobPost).where(RecruiterJobPost.user_id == recruiter.id)
    ).first()
    if existing:
        return 0

    base_time = datetime(2026, 4, 1)
    count = 0
    for i, post_data in enumerate(SEED_RECRUITER_POSTS):
        ts = base_time + timedelta(days=i * 3)
        post = RecruiterJobPost(
            user_id=recruiter.id,
            title=post_data["title"],
            company_name=post_data["company_name"],
            description=post_data["description"],
            category=post_data.get("category"),
            location=post_data.get("location"),
            salary_min=post_data.get("salary_min"),
            salary_max=post_data.get("salary_max"),
            required_skills=post_data.get("required_skills"),
            is_active=True,
            created_at=ts,
            updated_at=ts,
        )
        db.add(post)
        count += 1

    db.commit()
    return count


def seed_jobs_from_csv(db) -> int:
    """Import data_jobs.csv into the jobs table if empty."""
    import csv
    from pathlib import Path
    from sqlalchemy import select
    from .models import Job

    existing = db.execute(select(Job)).first()
    if existing:
        return 0

    csv_path = Path(__file__).resolve().parent.parent / "data" / "data_jobs.csv"
    if not csv_path.exists():
        return 0

    count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # parse work_from_home
            wfh = str(row.get("job_work_from_home", "")).strip().lower() == "true"
            no_deg = str(row.get("job_no_degree_mention", "")).strip().lower() == "true"
            health = str(row.get("job_health_insurance", "")).strip().lower() == "true"

            def to_float(val):
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return None

            posted_str = row.get("job_posted_date", "")
            posted = None
            if posted_str:
                try:
                    posted = datetime.strptime(posted_str.strip()[:19], "%Y-%m-%d %H:%M:%S")
                except Exception:
                    pass

            job = Job(
                title_short=row.get("job_title_short") or None,
                title=row.get("job_title") or row.get("job_title_short") or "Untitled",
                location=row.get("job_location") or None,
                via=row.get("job_via") or None,
                schedule_type=row.get("job_schedule_type") or None,
                work_from_home=wfh,
                country=row.get("job_country") or None,
                posted_date=posted,
                no_degree_mention=no_deg,
                health_insurance=health,
                salary_rate=row.get("salary_rate") or None,
                salary_year_avg=to_float(row.get("salary_year_avg")),
                salary_hour_avg=to_float(row.get("salary_hour_avg")),
                company_name=row.get("company_name") or None,
                skills=row.get("job_skills") or None,
                skills_typed=row.get("job_type_skills") or None,
                source="dataset",
            )
            db.add(job)
            count += 1

            if count % 500 == 0:
                db.flush()

    db.commit()
    return count
