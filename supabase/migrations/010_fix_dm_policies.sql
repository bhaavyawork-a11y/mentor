-- ─── Migration 010: DM tables + social columns (correct order) ────────────────
-- Migration 009 failed (rolled back) because dm_conversations RLS policy
-- referenced dm_participants before that table existed.
-- This migration creates everything in the correct dependency order.
-- Safe to re-run — all use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ─── 1. Columns on community_posts ───────────────────────────────────────────
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS media_urls text[]  DEFAULT '{}';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS repost_of  uuid    REFERENCES public.community_posts(id) ON DELETE SET NULL;

-- ─── 2. Saved posts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id    uuid        REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saved posts" ON public.saved_posts;
CREATE POLICY "Users manage own saved posts"
  ON public.saved_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts (post_id);

-- ─── 3. DM conversations (table only — NO policies yet) ──────────────────────
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  last_message    text,
  last_message_at timestamptz
);

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;

-- ─── 4. DM participants (must exist BEFORE dm_conversations policies) ─────────
CREATE TABLE IF NOT EXISTS public.dm_participants (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid        REFERENCES public.dm_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id         uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  unread_count    int         DEFAULT 0,
  last_read_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE (conversation_id, user_id)
);

ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own participations"   ON public.dm_participants;
DROP POLICY IF EXISTS "Participants can read others"   ON public.dm_participants;
DROP POLICY IF EXISTS "Users can join conversations"   ON public.dm_participants;
DROP POLICY IF EXISTS "Users update own participation" ON public.dm_participants;

CREATE POLICY "Users see own participations"
  ON public.dm_participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Participants can read others"
  ON public.dm_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.dm_participants p2
    WHERE p2.conversation_id = conversation_id AND p2.user_id = auth.uid()
  ));

CREATE POLICY "Users can join conversations"
  ON public.dm_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own participation"
  ON public.dm_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dm_participants_user_id         ON public.dm_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_conversation_id ON public.dm_participants (conversation_id);

-- ─── 5. NOW add dm_conversations policies (dm_participants exists) ─────────────
DROP POLICY IF EXISTS "Participants can read conversations"     ON public.dm_conversations;
DROP POLICY IF EXISTS "Authenticated users create conversations" ON public.dm_conversations;

CREATE POLICY "Participants can read conversations"
  ON public.dm_conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.dm_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users create conversations"
  ON public.dm_conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── 6. DM messages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid        REFERENCES public.dm_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content         text,
  shared_post_id  uuid        REFERENCES public.community_posts(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read messages" ON public.dm_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.dm_messages;

CREATE POLICY "Participants can read messages"
  ON public.dm_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.dm_participants
    WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "Participants can send messages"
  ON public.dm_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.dm_participants
      WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation_id ON public.dm_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created_at      ON public.dm_messages (created_at DESC);

-- ─── 7. Trigger: update conversation on new message ──────────────────────────
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.dm_conversations
  SET
    updated_at      = now(),
    last_message    = LEFT(COALESCE(NEW.content, '[shared a post]'), 80),
    last_message_at = now()
  WHERE id = NEW.conversation_id;

  UPDATE public.dm_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON public.dm_messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ─── 8. Follow counts on profiles ─────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count int DEFAULT 0;

CREATE OR REPLACE FUNCTION sync_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_follow_counts ON public.follows;
CREATE TRIGGER trg_sync_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();

-- ─── 9. Storage bucket for post media ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media', 'post-media', true, 52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read post media"       ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own media"           ON storage.objects;

CREATE POLICY "Anyone can read post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated users upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users delete own media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
