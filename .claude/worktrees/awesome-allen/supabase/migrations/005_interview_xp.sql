-- Add mock interview tracking columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_interview_score  numeric,
  ADD COLUMN IF NOT EXISTS last_interview_at     timestamptz,
  ADD COLUMN IF NOT EXISTS interview_xp          integer NOT NULL DEFAULT 0;
