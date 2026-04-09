-- Track career-meaningful events (not engagement vanity metrics)
CREATE TABLE IF NOT EXISTS career_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'job_application',      -- applied to a job posted in a group
    'invite_sent',          -- sent a peer invite
    'invite_accepted',      -- an invited peer joined
    'referral_post',        -- posted a referral request
    'intro_requested',      -- messaged a member after seeing them in a group
    'post_created',         -- created a substantive post (not a reply)
    'group_joined'          -- approved into a new group
  )),
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_career_events_user ON career_events(user_id, created_at DESC);
CREATE INDEX idx_career_events_type ON career_events(event_type, created_at DESC);
