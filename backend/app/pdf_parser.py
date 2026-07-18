"""
pdf_parser.py  –  100% local CV parser. No external API needed.

Extracts structured fields from a PDF resume using:
  - pdfplumber  -> text extraction (+ pytesseract OCR fallback for scanned PDFs)
  - regex       -> field extraction (email, phone, dates, education, certs)
  - keyword matching -> skills detection from a curated list
  - heuristics  -> name detection, experience years, AI score estimation
  - ML model    -> job role classification (job_role_classifier.pkl)
                   trained on 2,484 resumes across 24 job categories
                   (Kaggle Resume Dataset — 3 models compared, RF wins)
"""

from __future__ import annotations

import datetime
import io
import re
from pathlib import Path
from typing import Any

try:
    import pytesseract
    _HAS_OCR = True
except ImportError:
    _HAS_OCR = False

try:
    import pdfplumber
    _HAS_PDFPLUMBER = True
except ImportError:
    _HAS_PDFPLUMBER = False

# ─────────────────────────────────────────────────────────────────────────────
# ML JOB-ROLE CLASSIFIER  (trained in resume-nlp-comparison.ipynb)
# ─────────────────────────────────────────────────────────────────────────────
_JOB_ROLE_MODEL = None          # loaded lazily on first call
_MODEL_PATH = (
    Path(__file__).resolve().parents[1] / "models" / "job_role_classifier.pkl"
)

def _load_job_role_model():
    global _JOB_ROLE_MODEL
    if _JOB_ROLE_MODEL is None and _MODEL_PATH.exists():
        try:
            import joblib
            _JOB_ROLE_MODEL = joblib.load(_MODEL_PATH)
        except Exception:
            _JOB_ROLE_MODEL = None
    return _JOB_ROLE_MODEL


def _classify_job_role(text: str) -> str | None:
    """
    Predicts job role from resume text using the trained ML model.
    Falls back to keyword heuristics if the model file is missing.
    """
    model = _load_job_role_model()
    if model is not None:
        try:
            # Light cleaning (mirrors the notebook preprocessing)
            clean = re.sub(r'<[^>]+>', ' ', text)
            clean = re.sub(r'[^a-zA-Z\s]', ' ', clean)
            clean = re.sub(r'\s+', ' ', clean).strip().lower()
            return model.predict([clean])[0]
        except Exception:
            pass
    # ── fallback: keyword heuristics ────────────────────────────────────────
    tl = text.lower()
    if any(w in tl for w in ["software", "developer", "programmer", "python", "java", "backend", "frontend"]):
        return "INFORMATION-TECHNOLOGY"
    if any(w in tl for w in ["nurse", "doctor", "physician", "clinical", "patient", "hospital"]):
        return "HEALTHCARE"
    if any(w in tl for w in ["accountant", "audit", "gaap", "bookkeeping", "cpa"]):
        return "ACCOUNTANT"
    if any(w in tl for w in ["finance", "investment", "banking", "portfolio", "equity"]):
        return "FINANCE"
    if any(w in tl for w in ["teacher", "professor", "curriculum", "classroom", "school"]):
        return "TEACHER"
    if any(w in tl for w in ["engineer", "mechanical", "civil", "structural", "cad"]):
        return "ENGINEERING"
    if any(w in tl for w in ["chef", "cook", "culinary", "kitchen", "recipe"]):
        return "CHEF"
    if any(w in tl for w in ["hr", "human resources", "recruitment", "payroll", "talent"]):
        return "HR"
    if any(w in tl for w in ["sales", "revenue", "quota", "crm", "pipeline"]):
        return "SALES"
    if any(w in tl for w in ["design", "graphic", "ux", "ui", "photoshop", "figma"]):
        return "DESIGNER"
    return None


class PDFParseError(Exception):
    pass


# ─────────────────────────────────────────────────────────────────────────────
# 1. TEXT EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    if not _HAS_PDFPLUMBER:
        raise PDFParseError("pdfplumber is not installed.")
    pages_text = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = (page.extract_text() or "").strip()
            if not text and _HAS_OCR:
                img = page.to_image(resolution=200).original
                text = pytesseract.image_to_string(img, lang="eng").strip()
            pages_text.append(text)
    result = "\n".join(pages_text).strip()
    if not result:
        raise PDFParseError("Could not extract text from this PDF.")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 2. FIELD EXTRACTORS
# ─────────────────────────────────────────────────────────────────────────────

_SKILLS_LIST = [
    "Python","Java","JavaScript","TypeScript","C++","C#","Ruby","Go","Rust","Scala","Kotlin","Swift","PHP","MATLAB","R",
    "Machine Learning","Deep Learning","TensorFlow","PyTorch","Keras","Scikit-Learn","NLP","Computer Vision",
    "Neural Network","XGBoost","Pandas","NumPy","Matplotlib","Data Science","Data Analysis","Statistics","OpenCV",
    "React","Angular","Vue","Node.js","Django","Flask","FastAPI","Spring","HTML","CSS","REST API","GraphQL","jQuery",
    "SQL","MySQL","PostgreSQL","MongoDB","Redis","Elasticsearch","Apache Spark","Hadoop","Kafka","Airflow","Oracle",
    "AWS","Azure","GCP","Docker","Kubernetes","CI/CD","Git","Linux","Jenkins","Terraform","Ansible",
    "Excel","PowerPoint","Word","SAP","Salesforce","Tableau","Power BI","QuickBooks","Microsoft Office",
    "Accounting","Auditing","Finance","Banking","Taxation","Financial Reporting","GAAP","Budgeting","Investment",
    "Patient Care","Nursing","Clinical","Surgery","Pharmacy","Medical","Healthcare","Diagnosis","EMR",
    "Teaching","Curriculum","Lesson Planning","Classroom Management","Instruction","Education","Tutoring",
    "Graphic Design","Photoshop","Illustrator","AutoCAD","UI/UX","Figma","Adobe","InDesign",
    "Leadership","Management","Communication","Project Management","Agile","Scrum","Teamwork","Marketing","Sales",
    "Legal Research","Litigation","Contract","Compliance",
    "Civil Engineering","Structural","Construction","Welding",
    "Cooking","Menu Planning","Food Safety","Catering","Baking",
    "Personal Training","Nutrition","Coaching","Physical Training",
]


def _parse_email(text):
    m = re.search(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", text)
    return m.group(0) if m else None


def _parse_phone(text):
    m = re.search(r"\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}", text)
    if m: return m.group(0).strip()
    m = re.search(r"\+\d[\d\s\-]{8,14}\d", text)
    return m.group(0).strip() if m else None


def _parse_name(text):
    _SKIP = re.compile(
        r"^(summary|experience|education|skills|highlights|objective|profile|"
        r"certifications|references|projects|contact|about|work history|professional)", re.IGNORECASE)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:8]:
        if _SKIP.match(line): continue
        words = line.split()
        if 2 <= len(words) <= 4 and all(re.match(r"^[A-Za-z.\'-]+$", w) for w in words):
            return line.title()
    return None


def _parse_experience_years(text):
    for pat in [
        r"(\d+)\+?\s*years?\s+(?:of\s+)?(?:hands.on\s+)?(?:professional\s+)?experience",
        r"over\s+(\d+)\s*years?",
        r"more\s+than\s+(\d+)\s*years?",
        r"(\d+)\s*years?\s+experience",
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m: return float(m.group(1))

    current_year = datetime.datetime.now().year
    ranges = re.findall(r"(\d{4})\s*(?:to|to|–|-|—)\s*(Current|Present|\d{4})", text, re.IGNORECASE)
    total = sum(
        (current_year if e.lower() in ("current","present") else int(e)) - int(s)
        for s, e in ranges if 1970 <= int(s) <= current_year
    )
    return float(min(total, 40)) if total > 0 else 0.0


def _parse_education(text):
    tl = text.lower()
    if any(x in tl for x in ["ph.d","phd","doctorate"]): return "Ph.D"
    if "mba" in tl: return "MBA"
    if any(x in tl for x in ["master of","m.sc","m.s.","masters","master's"]): return "M.Sc"
    if any(x in tl for x in ["b.tech","btech","bachelor of technology"]): return "B.Tech"
    if any(x in tl for x in ["b.sc","bsc","bachelor of science","bachelor","undergraduate"]): return "B.Sc"
    return "Other"


def _parse_skills(text):
    tl = text.lower()
    return [s for s in _SKILLS_LIST if s.lower() in tl][:20]


def _parse_projects_count(text):
    bullets = re.findall(r"(?:^|\n)\s*[•\-▪►✓✔*]\s+\w", text)
    return min(len(bullets), 30)


def _parse_certifications(text):
    certs = []
    for pat in [
        r"(aws certified[^\n,\.;]{0,60})",r"(google[^\n,\.;]{0,30}certified[^\n,\.;]{0,30})",
        r"(microsoft certified[^\n,\.;]{0,60})",r"(oracle certified[^\n,\.;]{0,60})",
        r"(pmp[^\n,\.;]{0,40})",r"(cissp[^\n,\.;]{0,40})",r"(comptia[^\n,\.;]{0,60})",
        r"(ccna[^\n,\.;]{0,40})",r"(cpa[^\n,\.;]{0,40})",r"(scrum master[^\n,\.;]{0,40})",
        r"(six sigma[^\n,\.;]{0,40})",
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            c = m.group(1).strip()
            if c not in certs: certs.append(c)
    return ", ".join(certs[:3]) if certs else None


def _estimate_ai_score(skills, experience_years):
    ai_kw = {"machine learning","deep learning","tensorflow","pytorch","keras","nlp",
             "computer vision","neural network","xgboost","scikit-learn","data science","python","r"}
    hits = sum(1 for s in skills if s.lower() in ai_kw)
    base = min(hits * 12, 65)
    exp_bonus = min(experience_years * 1.5, 20)
    data_bonus = 10 if any(kw in (s.lower() for s in skills)
                           for kw in ["sql","pandas","numpy","spark","tableau"]) else 0
    return round(min(base + exp_bonus + data_bonus + 5, 100), 1)


def _parse_country(text):
    for c in ["USA","United States","UK","United Kingdom","Canada","Australia","India",
              "Germany","France","Tunisia","Morocco","Algeria","Egypt","UAE","Brazil","Mexico"]:
        if re.search(r"\b" + re.escape(c) + r"\b", text, re.IGNORECASE):
            return c
    return None


# ─────────────────────────────────────────────────────────────────────────────
# 3. PUBLIC ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def parse_cv_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    """
    100% local pipeline: pdf_bytes -> structured fields dict.
    No external API. No internet required.
    Returns a dict compatible with CandidateCreate(**result).
    """
    raw_text = extract_text_from_pdf(pdf_bytes)
    skills = _parse_skills(raw_text)
    experience_years = _parse_experience_years(raw_text)

    return {
        "full_name":          _parse_name(raw_text),
        "email":              _parse_email(raw_text),
        "phone":              _parse_phone(raw_text),
        "country":            _parse_country(raw_text),
        "Experience (Years)": experience_years,
        "Projects Count":     _parse_projects_count(raw_text),
        "AI Score (0-100)":   _estimate_ai_score(skills, experience_years),
        "Skills":             skills,
        "Education":          _parse_education(raw_text),
        "Job Role":           _classify_job_role(raw_text),
        "Certifications":     _parse_certifications(raw_text),
    }