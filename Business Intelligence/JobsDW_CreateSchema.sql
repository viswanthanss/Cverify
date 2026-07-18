/*
=============================================================
  JobMatch Data Warehouse - Creation Script  (v2 - Constellation)
  Database: JobsDW
  Schema:   dbo (staging) | dw (warehouse)

  CONSTELLATION SCHEMA:
  ─────────────────────
  FACT_JOB_POSTING  (granularity: 1 row per job posting)
      → DIM_JOB          (job role info)
      → DIM_COMPANY      (employer)
      → DIM_LOCATION     (geography)
      → DIM_DATE         (posting date)
      → DIM_VIA          (job board / source)

  FACT_JOB_SKILL    (granularity: 1 row per posting × skill)
      → DIM_JOB          (shared conforming dimension)
      → DIM_SKILL → DIM_CATEGORIE (outrigger)

  BI RULES APPLIED:
    ✗ DIM_SALARY_RATE removed   → salary_rate is a measure/degenerate dim in FACT
    ✗ BRIDGE_POSTING_SKILL removed → replaced by FACT_JOB_SKILL
    ✗ No fact-to-fact FK        → drill-across via shared DIM_JOB
    ✓ Flags in FACT not DIM     → they vary per posting, not per job type
=============================================================
*/

USE [master]
GO

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'JobsDW')
BEGIN
    CREATE DATABASE [JobsDW]
END
GO

USE [JobsDW]
GO

-- Create dw schema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dw')
    EXEC('CREATE SCHEMA [dw]')
GO

-- =============================================
-- STAGING TABLE (landing zone from CSV/SSIS)
-- =============================================
IF OBJECT_ID('dbo.stg_jobmatch_raw', 'U') IS NOT NULL DROP TABLE [dbo].[stg_jobmatch_raw];
GO

CREATE TABLE [dbo].[stg_jobmatch_raw](
    [posting_id]            INT IDENTITY(1,1)   NOT NULL,   -- surrogate for ETL tracking
    [job_title_short]       NVARCHAR(1000)      NULL,
    [job_title]             NVARCHAR(1000)      NULL,
    [job_location]          NVARCHAR(2000)      NULL,
    [job_via]               NVARCHAR(1000)      NULL,
    [job_schedule_type]     NVARCHAR(1000)      NULL,
    [job_work_from_home]    NVARCHAR(100)       NULL,
    [search_location]       NVARCHAR(1000)      NULL,
    [job_posted_date]       NVARCHAR(100)       NULL,
    [job_no_degree_mention] NVARCHAR(100)       NULL,
    [job_health_insurance]  NVARCHAR(100)       NULL,
    [job_country]           NVARCHAR(1000)      NULL,
    [salary_rate]           NVARCHAR(100)       NULL,
    [salary_year_avg]       NVARCHAR(100)       NULL,
    [salary_hour_avg]       NVARCHAR(100)       NULL,
    [company_name]          NVARCHAR(1000)      NULL,
    [job_skills]            NVARCHAR(4000)      NULL,
    [job_type_skills]       NVARCHAR(4000)      NULL
) ON [PRIMARY]
GO

-- NOTE: stg_skills_flat removed.
-- Skills (job_skills, job_type_skills) are kept as raw comma-separated strings in stg_jobmatch_raw.
-- Splitting and loading into DIM_SKILL / FACT_JOB_SKILL is handled directly in the SSIS data flow.


-- =============================================
-- DIMENSION TABLES
-- =============================================

-- ─────────────────────────────────────────────
-- DIM_JOB  (shared conforming dimension)
-- Used by: FACT_JOB_POSTING, FACT_JOB_SKILL
-- ─────────────────────────────────────────────
IF OBJECT_ID('dw.DIM_JOB', 'U') IS NOT NULL DROP TABLE [dw].[DIM_JOB];
GO

CREATE TABLE [dw].[DIM_JOB](
    [job_id]                INT IDENTITY(1,1)   NOT NULL,
    [job_title_short]       NVARCHAR(1000)      NOT NULL,
    [job_title]             NVARCHAR(1000)      NOT NULL,
    [job_schedule_type]     NVARCHAR(1000)      NULL,
    CONSTRAINT [PK_DIM_JOB] PRIMARY KEY CLUSTERED ([job_id])
)
GO

-- ─────────────────────────────────────────────
-- DIM_COMPANY
-- Used by: FACT_JOB_POSTING only
-- ─────────────────────────────────────────────
IF OBJECT_ID('dw.DIM_COMPANY', 'U') IS NOT NULL DROP TABLE [dw].[DIM_COMPANY];
GO

CREATE TABLE [dw].[DIM_COMPANY](
    [company_id]    INT IDENTITY(1,1)   NOT NULL,
    [company_name]  NVARCHAR(255)       NOT NULL,
    CONSTRAINT [PK_DIM_COMPANY] PRIMARY KEY CLUSTERED ([company_id])
)
GO

-- ─────────────────────────────────────────────
-- DIM_LOCATION
-- Used by: FACT_JOB_POSTING only
-- ─────────────────────────────────────────────
IF OBJECT_ID('dw.DIM_LOCATION', 'U') IS NOT NULL DROP TABLE [dw].[DIM_LOCATION];
GO

CREATE TABLE [dw].[DIM_LOCATION](
    [location_id]       INT IDENTITY(1,1)   NOT NULL,
    [job_country]       NVARCHAR(150)       NULL,
    [job_location]      NVARCHAR(255)       NULL,
    [search_location]   NVARCHAR(255)       NULL,
    CONSTRAINT [PK_DIM_LOCATION] PRIMARY KEY CLUSTERED ([location_id])
)
GO

-- ─────────────────────────────────────────────
-- DIM_DATE
-- Used by: FACT_JOB_POSTING only
-- ─────────────────────────────────────────────
IF OBJECT_ID('dw.DIM_DATE', 'U') IS NOT NULL DROP TABLE [dw].[DIM_DATE];
GO

CREATE TABLE [dw].[DIM_DATE](
    [date_id]       INT             NOT NULL,
    [full_date]     DATE            NOT NULL,
    [year]          INT             NOT NULL,
    [month]         TINYINT         NOT NULL,
    [month_name]    NVARCHAR(20)    NOT NULL,
    [quarter]       TINYINT         NOT NULL,
    [day_of_week]   NVARCHAR(20)    NOT NULL,
    CONSTRAINT [PK_DIM_DATE] PRIMARY KEY CLUSTERED ([date_id]),
    CONSTRAINT [UQ_DIM_DATE_full_date] UNIQUE ([full_date]),
    CONSTRAINT [CK_DIM_DATE_month]   CHECK ([month]   BETWEEN 1 AND 12),
    CONSTRAINT [CK_DIM_DATE_quarter] CHECK ([quarter] BETWEEN 1 AND 4)
)
GO

-- ─────────────────────────────────────────────
-- DIM_VIA
-- Used by: FACT_JOB_POSTING only
-- ─────────────────────────────────────────────
IF OBJECT_ID('dw.DIM_VIA', 'U') IS NOT NULL DROP TABLE [dw].[DIM_VIA];
GO

CREATE TABLE [dw].[DIM_VIA](
    [via_id]    INT IDENTITY(1,1)   NOT NULL,
    [job_via]   NVARCHAR(255)       NOT NULL,
    CONSTRAINT [PK_DIM_VIA] PRIMARY KEY CLUSTERED ([via_id])
)
GO

-- ─────────────────────────────────────────────
-- DIM_CATEGORIE  (outrigger of DIM_SKILL)
-- ─────────────────────────────────────────────
IF OBJECT_ID('dw.DIM_CATEGORIE', 'U') IS NOT NULL DROP TABLE [dw].[DIM_CATEGORIE];
GO

CREATE TABLE [dw].[DIM_CATEGORIE](
    [categorie_id]      INT IDENTITY(1,1)   NOT NULL,
    [nom_categorie]     NVARCHAR(100)       NOT NULL,
    CONSTRAINT [PK_DIM_CATEGORIE] PRIMARY KEY CLUSTERED ([categorie_id]),
    CONSTRAINT [UQ_DIM_CATEGORIE_nom] UNIQUE ([nom_categorie])
)
GO

-- ─────────────────────────────────────────────
-- DIM_SKILL  (with outrigger FK to DIM_CATEGORIE)
-- Used by: FACT_JOB_SKILL only
-- ─────────────────────────────────────────────
IF OBJECT_ID('dw.DIM_SKILL', 'U') IS NOT NULL DROP TABLE [dw].[DIM_SKILL];
GO

CREATE TABLE [dw].[DIM_SKILL](
    [skill_id]      INT IDENTITY(1,1)   NOT NULL,
    [skill_name]    NVARCHAR(150)       NOT NULL,
    [categorie_id]  INT                 NULL,
    CONSTRAINT [PK_DIM_SKILL] PRIMARY KEY CLUSTERED ([skill_id]),
    CONSTRAINT [UQ_DIM_SKILL_name] UNIQUE ([skill_name]),
    CONSTRAINT [FK_DIM_SKILL_DIM_CATEGORIE] FOREIGN KEY ([categorie_id])
        REFERENCES [dw].[DIM_CATEGORIE] ([categorie_id])
)
GO


-- =============================================
-- FACT TABLE ①  —  FACT_JOB_POSTING
-- Granularity: one row per job posting
-- =============================================
--
--  CHANGES vs original:
--    ✓ salary_rate_id FK REMOVED  → salary_rate is now a degenerate dimension (varchar column)
--    ✓ Flags MOVED HERE from DIM_JOB → they vary per posting, not per job type
--    ✗ No FK to FACT_JOB_SKILL    → facts are independent
--
IF OBJECT_ID('dw.FACT_JOB_POSTING', 'U') IS NOT NULL DROP TABLE [dw].[FACT_JOB_POSTING];
GO

CREATE TABLE [dw].[FACT_JOB_POSTING](
    [posting_id]              INT IDENTITY(1,1)   NOT NULL,
    -- Dimension FKs
    [job_id]                  INT                 NOT NULL,
    [company_id]              INT                 NOT NULL,
    [location_id]             INT                 NOT NULL,
    [date_id]                 INT                 NOT NULL,
    [via_id]                  INT                 NULL,
    -- Degenerate dimension (was DIM_SALARY_RATE — too few values to justify a dimension)
    [salary_rate]             NVARCHAR(50)        NULL,
    -- Flags (per-posting attributes, not per-job-type)
    [work_from_home_flag]     INT                 NOT NULL  CONSTRAINT [DF_FACT_wfh]        DEFAULT (0),
    [no_degree_mention_flag]  INT                 NOT NULL  CONSTRAINT [DF_FACT_no_degree]  DEFAULT (0),
    [health_insurance_flag]   INT                 NOT NULL  CONSTRAINT [DF_FACT_health]     DEFAULT (0),
    -- Measures
    [posting_count]           INT                 NOT NULL  CONSTRAINT [DF_FACT_posting_count] DEFAULT (1),
    [salary_year_avg]         DECIMAL(18,2)       NULL,
    [salary_hour_avg]         DECIMAL(18,2)       NULL,
    -- PK
    CONSTRAINT [PK_FACT_JOB_POSTING] PRIMARY KEY CLUSTERED ([posting_id]),
    -- FKs (dimensions only — never another fact)
    CONSTRAINT [FK_FACT_DIM_JOB]         FOREIGN KEY ([job_id])         REFERENCES [dw].[DIM_JOB]       ([job_id]),
    CONSTRAINT [FK_FACT_DIM_COMPANY]     FOREIGN KEY ([company_id])     REFERENCES [dw].[DIM_COMPANY]   ([company_id]),
    CONSTRAINT [FK_FACT_DIM_LOCATION]    FOREIGN KEY ([location_id])    REFERENCES [dw].[DIM_LOCATION]  ([location_id]),
    CONSTRAINT [FK_FACT_DIM_DATE]        FOREIGN KEY ([date_id])        REFERENCES [dw].[DIM_DATE]      ([date_id]),
    CONSTRAINT [FK_FACT_DIM_VIA]         FOREIGN KEY ([via_id])         REFERENCES [dw].[DIM_VIA]       ([via_id]),
    -- Check constraints
    CONSTRAINT [CK_FACT_posting_count]   CHECK ([posting_count]   >= 0),
    CONSTRAINT [CK_FACT_salary_year]     CHECK ([salary_year_avg] IS NULL OR [salary_year_avg] >= 0),
    CONSTRAINT [CK_FACT_salary_hour]     CHECK ([salary_hour_avg] IS NULL OR [salary_hour_avg] >= 0)
)
GO


-- =============================================
-- FACT TABLE ②  —  FACT_JOB_SKILL     (NEW)
-- Granularity: one row per job × skill
-- =============================================
--
--  Replaces BRIDGE_POSTING_SKILL.
--  Connects ONLY to dimensions — no FK to FACT_JOB_POSTING.
--  Cross-fact analysis uses drill-across on shared DIM_JOB.
--
IF OBJECT_ID('dw.FACT_JOB_SKILL', 'U') IS NOT NULL DROP TABLE [dw].[FACT_JOB_SKILL];
GO

CREATE TABLE [dw].[FACT_JOB_SKILL](
    [job_skill_id]    INT IDENTITY(1,1)   NOT NULL,
    -- Dimension FKs only
    [job_id]          INT                 NOT NULL,
    [skill_id]        INT                 NOT NULL,
    -- Measures
    [skill_count]     INT                 NOT NULL  CONSTRAINT [DF_FACT_JS_count] DEFAULT (1),
    -- PK
    CONSTRAINT [PK_FACT_JOB_SKILL] PRIMARY KEY CLUSTERED ([job_skill_id]),
    -- Unique: one skill per job (prevents duplicate rows)
    CONSTRAINT [UQ_FACT_JOB_SKILL] UNIQUE ([job_id], [skill_id]),
    -- FKs (dimensions only)
    CONSTRAINT [FK_FACT_JS_DIM_JOB]   FOREIGN KEY ([job_id])   REFERENCES [dw].[DIM_JOB]   ([job_id]),
    CONSTRAINT [FK_FACT_JS_DIM_SKILL] FOREIGN KEY ([skill_id]) REFERENCES [dw].[DIM_SKILL]  ([skill_id]),
    -- Check
    CONSTRAINT [CK_FACT_JS_count]     CHECK ([skill_count] >= 0)
)
GO


-- =============================================
-- INDEXES (for SSAS / Power BI query performance)
-- =============================================

-- FACT_JOB_POSTING dimension lookups
CREATE NONCLUSTERED INDEX [IX_FACT_JP_job_id]      ON [dw].[FACT_JOB_POSTING] ([job_id]);
CREATE NONCLUSTERED INDEX [IX_FACT_JP_company_id]  ON [dw].[FACT_JOB_POSTING] ([company_id]);
CREATE NONCLUSTERED INDEX [IX_FACT_JP_location_id] ON [dw].[FACT_JOB_POSTING] ([location_id]);
CREATE NONCLUSTERED INDEX [IX_FACT_JP_date_id]     ON [dw].[FACT_JOB_POSTING] ([date_id]);
CREATE NONCLUSTERED INDEX [IX_FACT_JP_via_id]      ON [dw].[FACT_JOB_POSTING] ([via_id]);
GO

-- FACT_JOB_SKILL dimension lookups
CREATE NONCLUSTERED INDEX [IX_FACT_JS_job_id]      ON [dw].[FACT_JOB_SKILL] ([job_id]);
CREATE NONCLUSTERED INDEX [IX_FACT_JS_skill_id]    ON [dw].[FACT_JOB_SKILL] ([skill_id]);
GO


PRINT '=== JobsDW constellation schema created successfully ==='
PRINT '  FACT_JOB_POSTING  → DIM_JOB (shared), DIM_COMPANY, DIM_LOCATION, DIM_DATE, DIM_VIA'
PRINT '  FACT_JOB_SKILL    → DIM_JOB (shared), DIM_SKILL → DIM_CATEGORIE'
PRINT '  Drill-across via conforming DIM_JOB'
PRINT '  No bridge tables · No fact-to-fact FK'
GO
