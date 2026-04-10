-- ─────────────────────────────────────────────────────────────────────────────
-- 016: Employer job posting system
-- Companies post jobs directly to verified role-specific groups
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── companies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  website    text,
  industry   text,
  size       text        CHECK (size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  logo_url   text,
  posted_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ─── job_postings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_postings (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id        uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  community_id      uuid        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  posted_by         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  description       text        NOT NULL,
  role_type         text        NOT NULL,
  experience_min    integer,
  experience_max    integer,
  location          text,
  remote_ok         boolean     DEFAULT false,
  compensation_min  integer,
  compensation_max  integer,
  status            text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'draft')),
  application_email text,
  application_url   text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  expires_at        timestamptz DEFAULT now() + INTERVAL '30 days' NOT NULL
);

-- ─── job_applications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_applications (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id       uuid        NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_note   text,
  status       text        NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'viewed', 'shortlisted', 'rejected')),
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (job_id, applicant_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_postings_community  ON public.job_postings (community_id, status);
CREATE INDEX IF NOT EXISTS idx_job_postings_company    ON public.job_postings (company_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_posted_by  ON public.job_postings (posted_by);
CREATE INDEX IF NOT EXISTS idx_job_applications_job    ON public.job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user   ON public.job_applications (applicant_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- companies policies
DROP POLICY IF EXISTS "Companies are viewable by all"   ON public.companies;
DROP POLICY IF EXISTS "Users can create companies"      ON public.companies;
DROP POLICY IF EXISTS "Users can update own company"    ON public.companies;

CREATE POLICY "Companies are viewable by all"
  ON public.companies FOR SELECT USING (true);

CREATE POLICY "Users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Users can update own company"
  ON public.companies FOR UPDATE
  USING (auth.uid() = posted_by);

-- job_postings policies
DROP POLICY IF EXISTS "Job postings are viewable by all"    ON public.job_postings;
DROP POLICY IF EXISTS "Users can post jobs"                 ON public.job_postings;
DROP POLICY IF EXISTS "Users can update own job postings"   ON public.job_postings;
DROP POLICY IF EXISTS "Users can delete own job postings"   ON public.job_postings;

CREATE POLICY "Job postings are viewable by all"
  ON public.job_postings FOR SELECT USING (true);

CREATE POLICY "Users can post jobs"
  ON public.job_postings FOR INSERT
  WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Users can update own job postings"
  ON public.job_postings FOR UPDATE
  USING (auth.uid() = posted_by);

CREATE POLICY "Users can delete own job postings"
  ON public.job_postings FOR DELETE
  USING (auth.uid() = posted_by);

-- job_applications policies
DROP POLICY IF EXISTS "Users see own applications"  ON public.job_applications;
DROP POLICY IF EXISTS "Users can apply to jobs"     ON public.job_applications;
DROP POLICY IF EXISTS "Users can withdraw applications" ON public.job_applications;

CREATE POLICY "Users see own applications"
  ON public.job_applications FOR SELECT
  USING (
    auth.uid() = applicant_id
    OR auth.uid() IN (
      SELECT posted_by FROM public.job_postings WHERE id = job_id
    )
  );

CREATE POLICY "Users can apply to jobs"
  ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can withdraw applications"
  ON public.job_applications FOR DELETE
  USING (auth.uid() = applicant_id);
