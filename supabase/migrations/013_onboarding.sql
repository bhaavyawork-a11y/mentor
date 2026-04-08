-- ─────────────────────────────────────────────────────────────────────────────
-- 013: Onboarding flag on profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Existing users are already "onboarded" — don't redirect them
UPDATE public.profiles SET onboarding_completed = true WHERE created_at < now() - interval '1 minute';
