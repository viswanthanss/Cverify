# CVerify — ML Models Documentation

All models are trained in `scripts/` Jupyter notebooks and served by the FastAPI
backend via `backend/app/predictor.py` and `backend/app/job_recommender.py`.

---

## 1. Hire / Reject Classifier

**File:** `backend/models/hire_classifier.pkl`  
**Algorithm:** XGBoost Classifier  
**Training notebook:** `scripts/resume-ml-pj.ipynb`  
**Training dataset:** `backend/data/AI_Resume_Screening.csv` (~1 500 rows)

### Input Features

| Feature              | Type    | Source                           |
|----------------------|---------|----------------------------------|
| Education Level      | int     | 1=High School … 5=PhD            |
| Experience (Years)   | float   | Extracted from CV text           |
| Projects Count       | int     | Extracted from CV text           |
| AI Score (0-100)     | float   | Recruiter-set or form slider     |
| skill_count          | int     | Number of distinct skills        |
| total_work_score     | float   | Composite of exp + projects      |
| ai_exp_ratio         | float   | ai_score / max(experience, 1)   |
| has_certification    | int     | 0 or 1                           |

### Output

`hire_probability` — float between 0 and 1 representing likelihood of being hired.

### Classes

`["Hired", "Not Hired"]` — model returns probability for the "Hired" class.

---

## 2. Salary Predictor

**File:** `backend/models/salary_predictor.pkl`  
**Algorithm:** Linear Regression  
**Training notebook:** `scripts/resume-ml-pj.ipynb`

### Input / Output

Same 8 features as the classifier.  
Output: `predicted_salary` — estimated annual salary in EUR (€).

---

## 3. KMeans Candidate Clustering

**File:** `backend/models/kmeans_bundle.pkl`  
**Algorithm:** KMeans (k=4) with a ColumnTransformer preprocessor  
**Training notebook:** `scripts/resume-ml-pj.ipynb`

### Clusters (approximate interpretation)

| Cluster | Profile                          |
|---------|----------------------------------|
| 0       | Senior / high-score experts      |
| 1       | Mid-level engineers              |
| 2       | Junior / entry-level candidates  |
| 3       | Career-changers / mixed profiles |

The cluster is displayed in the dashboard as a label and used to color-code candidates.

---

## 4. Job Role Classifier (NLP)

**File:** `backend/models/job_role_classifier.pkl`  
**Algorithm:** TF-IDF vectoriser + multi-class classifier  
**Training notebook:** `scripts/nlp-model-comparison-for-resume-job-role-classific.ipynb`

### 24 Supported Categories

```
ACCOUNTANT            ADVOCATE              AGRICULTURE
APPAREL               ARTS                  AUTOMOBILE
AVIATION              BANKING               BUSINESS-DEVELOPMENT
CHEF                  CONSTRUCTION          CONSULTANT
DESIGNER              DIGITAL-MEDIA         ENGINEERING
FINANCE               FITNESS               HEALTHCARE
INFORMATION-TECHNOLOGY PUBLIC-RELATIONS     SALES
TEACHER               TOURISM               INFORMATION-TECHNOLOGY
```

### Usage

Called by `pdf_parser.py` to classify the CV's primary domain.
The resulting `job_role` is stored in `candidate_cvs` and used by
the recommender to bias results toward matching job categories.

---

## 5. Job Recommender v2

**File:** `backend/models/job_recommender_v2.pkl`  
**Algorithm:** TF-IDF + cosine similarity  
**Training notebook:** `scripts/job-recommender-model.ipynb`  
**Corpus:** 20 414 job descriptions from `data_jobs.csv`

### How it Works

1. Candidate's skills + job_role are concatenated into a query string.
2. The TF-IDF vectorizer (trained on job descriptions) transforms the query.
3. Cosine similarity is computed against all 20 k+ job vectors.
4. Top-10 results are returned ordered by `match_score` (0–1).

### Output per Recommendation

```json
{
  "rank": 1,
  "job_id": 1234,
  "title": "Senior Data Scientist",
  "company_name": "Capgemini",
  "location": "Paris",
  "match_score": 0.94,
  "skills": "python, pytorch, nlp, sql"
}
```

---

## Feature Engineering — `feature_builder.py`

```python
build_features(payload: CandidateCreate) -> pd.DataFrame
```

Accepts a `CandidateCreate` Pydantic model and returns a single-row DataFrame
with the 8 features needed by both the classifier and regressor.

Key transformations:
- `education` string → `education_level` int (look-up table)
- `certifications` non-empty → `has_certification = 1`
- `ai_score + experience → ai_exp_ratio`
- `experience + projects → total_work_score`

---

## Re-training

To update a model:
1. Open the corresponding notebook in `scripts/`
2. Run all cells (requires the CSV training data)
3. The last cell exports the model to `backend/models/<name>.pkl`
4. Rebuild the Docker image: `docker compose build backend`
