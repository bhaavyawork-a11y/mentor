-- ─────────────────────────────────────────────────────────────────────────────
-- 018: Employer verification
-- Adds employer status to profiles so only verified HR/hiring managers
-- can post jobs to groups.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add employer columns to profiles (safe to re-run)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_employer_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS employer_company     text,
  ADD COLUMN IF NOT EXISTS employer_title       text,
  ADD COLUMN IF NOT EXISTS employer_verified_at timestamptz;

-- Index for quick lookup when gating /post-job
CREATE INDEX IF NOT EXISTS idx_profiles_employer
  ON public.profiles (id) WHERE is_employer_verified = true;
