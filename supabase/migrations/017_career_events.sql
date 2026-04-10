-- ─────────────────────────────────────────────────────────────────────────────
-- 017: Career events (North Star metric foundation)
-- Tracks meaningful career actions — not vanity engagement metrics
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.career_events (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type   text        NOT NULL CHECK (event_type IN (
    'job_application',   -- applied to a job posted in a group
    'invite_sent',       -- sent a peer invite
    'invite_accepted',   -- an invited peer joined
    'referral_post',     -- posted a referral request
    'intro_requested',   -- messaged a member after seeing them in a group
    'post_created',      -- created a substantive post (not a reply)
    'group_joined'       -- approved into a new group
  )),
  community_id uuid        REFERENCES public.communities(id) ON DELETE SET NULL,
  metadata     jsonb       DEFAULT '{}',
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_career_events_user
  ON public.career_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_events_type
  ON public.career_events (event_type, created_at DESC);
