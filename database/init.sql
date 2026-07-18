-- ============================================================
-- CVerify — PostgreSQL Initial Schema
-- Auto-applied on first docker compose up via init.sql mount
-- ============================================================

-- ── Users & Authentication ───────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200),
    role            VARCHAR(50) NOT NULL DEFAULT 'candidate',  -- candidate | recruiter | admin
    company         VARCHAR(200),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── Candidates table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_cvs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    full_name       VARCHAR(200),
    email           VARCHAR(200),
    phone           VARCHAR(100),
    education       VARCHAR(200),
    job_role        VARCHAR(200),
    experience_years FLOAT NOT NULL,
    projects_count  INTEGER NOT NULL,
    ai_score        FLOAT NOT NULL,
    score_travail_total FLOAT NOT NULL,
    skills          TEXT NOT NULL,
    certifications  TEXT,
    hire_probability FLOAT,
    predicted_salary FLOAT,
    candidate_cluster INTEGER,
    recommendation  TEXT,
    raw_payload     TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_user_id ON candidate_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_role ON candidate_cvs(job_role);
CREATE INDEX IF NOT EXISTS idx_candidate_created_at ON candidate_cvs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_hire_prob ON candidate_cvs(hire_probability);

-- ── Jobs (data_jobs.csv + scraped) ───────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id                  SERIAL PRIMARY KEY,
    title_short         VARCHAR(200),
    title               VARCHAR(500) NOT NULL,
    location            VARCHAR(300),
    via                 VARCHAR(200),
    schedule_type       VARCHAR(100),
    work_from_home      BOOLEAN DEFAULT FALSE,
    country             VARCHAR(100),
    posted_date         TIMESTAMP,
    no_degree_mention   BOOLEAN DEFAULT FALSE,
    health_insurance    BOOLEAN DEFAULT FALSE,
    salary_rate         VARCHAR(50),
    salary_year_avg     FLOAT,
    salary_hour_avg     FLOAT,
    company_name        VARCHAR(300),
    skills              TEXT,
    skills_typed        TEXT,
    source              VARCHAR(100) DEFAULT 'dataset',  -- dataset | scraper
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_title_short ON jobs(title_short);
CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);

-- ── Recruiter Job Posts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruiter_job_posts (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    company_name    VARCHAR(200),
    description     TEXT,
    category        VARCHAR(100),
    location        VARCHAR(200),
    salary_min      FLOAT,
    salary_max      FLOAT,
    required_skills TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recruiter_posts_user ON recruiter_job_posts(user_id);

-- ── Job Applications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_post_id     INTEGER REFERENCES recruiter_job_posts(id) ON DELETE SET NULL,
    job_id          INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    cv_id           INTEGER REFERENCES candidate_cvs(id) ON DELETE SET NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending | reviewed | accepted | rejected
    cover_letter    TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_post ON job_applications(job_post_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);

-- ── Scrape Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_logs (
    id              SERIAL PRIMARY KEY,
    source          VARCHAR(200) NOT NULL,
    records_added   INTEGER DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'success',
    error_message   TEXT,
    scraped_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Seed default admin user (password: admin123) ─────────────
-- bcrypt hash of 'admin123' — change in production!
INSERT INTO users (email, hashed_password, full_name, role, is_active)
VALUES ('admin@cverify.com',
        '$2b$12$LJ3m4ys3Lp7Q9Z8X1r7jXeVr3YQKZqI4hX5c0iD4k8s6h0z1T2vHy',
        'Admin',
        'admin',
        TRUE)
ON CONFLICT (email) DO NOTHING;

-- ── Seed Esprit accounts (password: Esprit2026!) ─────────────
INSERT INTO users (email, hashed_password, full_name, role, company, is_active)
VALUES ('imed.attia@esprit.tn',
        '$2b$12$DJDIo8tTyqRVa3WaSBw7Fe/5gZyLPrZYttZq.O6/HqNBPdvp5LX0i',
        'Imed Attia',
        'admin',
        NULL,
        TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, hashed_password, full_name, role, company, is_active)
VALUES ('khalil.chiha@esprit.tn',
        '$2b$12$DJDIo8tTyqRVa3WaSBw7Fe/5gZyLPrZYttZq.O6/HqNBPdvp5LX0i',
        'Khalil Chiha',
        'recruiter',
        'Esprit',
        TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, hashed_password, full_name, role, company, is_active)
VALUES ('zaineb.khlifi@esprit.tn',
        '$2b$12$DJDIo8tTyqRVa3WaSBw7Fe/5gZyLPrZYttZq.O6/HqNBPdvp5LX0i',
        'Zaineb Khlifi',
        'candidate',
        NULL,
        TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, hashed_password, full_name, role, company, is_active)
VALUES ('yessine.mnejja@esprit.tn',
        '$2b$12$DJDIo8tTyqRVa3WaSBw7Fe/5gZyLPrZYttZq.O6/HqNBPdvp5LX0i',
        'Yessine Mnejja',
        'candidate',
        NULL,
        TRUE)
ON CONFLICT (email) DO NOTHING;
