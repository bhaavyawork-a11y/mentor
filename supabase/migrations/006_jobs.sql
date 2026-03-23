-- ─── Job listings (synced from Lever + Greenhouse) ───────────────────────────

CREATE TABLE IF NOT EXISTS job_listings (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id         text        UNIQUE NOT NULL,
  source              text        NOT NULL CHECK (source IN ('lever', 'greenhouse')),
  title               text        NOT NULL,
  company_name        text        NOT NULL,
  company_slug        text        NOT NULL,
  location            text,
  department          text,
  job_type            text,
  apply_url           text        NOT NULL,
  description_snippet text,
  posted_at           timestamptz,
  is_active           boolean     DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_job_listings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_job_listings_updated_at
  BEFORE UPDATE ON job_listings
  FOR EACH ROW EXECUTE FUNCTION update_job_listings_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_listings_company_slug ON job_listings (company_slug);
CREATE INDEX IF NOT EXISTS idx_job_listings_source        ON job_listings (source);
CREATE INDEX IF NOT EXISTS idx_job_listings_posted_at     ON job_listings (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_listings_is_active     ON job_listings (is_active);

-- RLS
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active job listings"
  ON job_listings FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ─── Saved jobs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_jobs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id     uuid        REFERENCES job_listings(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs (user_id);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved jobs"
  ON saved_jobs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
