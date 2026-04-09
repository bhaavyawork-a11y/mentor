-- ─────────────────────────────────────────────────────────────────────────────
-- 015: Member invite token system
-- Allows approved members to invite peers with limited tokens
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Invite tokens table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_invites (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  invitee_email text        NOT NULL,
  token        text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status       text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'used', 'expired')),
  created_at   timestamptz DEFAULT now() NOT NULL,
  used_at      timestamptz,
  expires_at   timestamptz DEFAULT now() + INTERVAL '30 days' NOT NULL
);

ALTER TABLE public.community_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for invites
DROP POLICY IF EXISTS "Users see own invites sent" ON public.community_invites;
DROP POLICY IF EXISTS "Users create invites" ON public.community_invites;

CREATE POLICY "Users see own invites sent"
  ON public.community_invites FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users create invites"
  ON public.community_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_community_invites_inviter
  ON public.community_invites (inviter_id, community_id);

CREATE INDEX IF NOT EXISTS idx_community_invites_token
  ON public.community_invites (token);

CREATE INDEX IF NOT EXISTS idx_community_invites_email
  ON public.community_invites (invitee_email);

CREATE INDEX IF NOT EXISTS idx_community_invites_status
  ON public.community_invites (status, expires_at);
