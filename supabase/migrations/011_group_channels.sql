-- ─── Migration 011: Community channels + group chat ───────────────────────────
-- Adds WhatsApp-style channels within each community (Casual, Referrals, etc.)
-- plus real-time group chat messages and pinned message support.
-- Safe to re-run — all use IF NOT EXISTS.

-- ─── 1. Community channels ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_channels (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid        REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  name         text        NOT NULL,
  slug         text        NOT NULL,
  emoji        text        DEFAULT '#',
  description  text,
  position     int         DEFAULT 0,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (community_id, slug)
);

ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Channels are public" ON public.community_channels;
CREATE POLICY "Channels are public" ON public.community_channels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage channels" ON public.community_channels;
CREATE POLICY "Admins manage channels" ON public.community_channels FOR ALL USING (true);

-- ─── 2. Channel messages (group chat) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid        REFERENCES public.community_channels(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content    text        NOT NULL,
  is_pinned  boolean     DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read channel messages" ON public.channel_messages;
DROP POLICY IF EXISTS "Members can post channel messages" ON public.channel_messages;
DROP POLICY IF EXISTS "Authors can delete own messages"   ON public.channel_messages;
DROP POLICY IF EXISTS "Members can pin messages"          ON public.channel_messages;

-- Anyone can read (we gate in the UI on membership)
CREATE POLICY "Members can read channel messages"
  ON public.channel_messages FOR SELECT USING (true);

-- Authenticated users can post
CREATE POLICY "Members can post channel messages"
  ON public.channel_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authors can delete own messages
CREATE POLICY "Authors can delete own messages"
  ON public.channel_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Members can toggle pin
CREATE POLICY "Members can pin messages"
  ON public.channel_messages FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON public.channel_messages (channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON public.channel_messages (created_at ASC);

-- ─── 3. Seed 4 channels for every existing community ─────────────────────────
INSERT INTO public.community_channels (community_id, name, slug, emoji, description, position)
SELECT c.id, ch.name, ch.slug, ch.emoji, ch.about, ch.pos
FROM public.communities c
CROSS JOIN (VALUES
  ('Casual',    'casual',    '💬', 'Intros, random chat, off-topic fun',                 0),
  ('Referrals', 'referrals', '🤝', 'Job referrals, hiring, opportunities',               1),
  ('Work Talk', 'work-talk', '💼', 'Career advice, work challenges, industry insights',  2),
  ('Upskilling','upskilling','📚', 'Courses, certs, skill building, book recs',          3)
) AS ch(name, slug, emoji, about, pos)
ON CONFLICT (community_id, slug) DO NOTHING;

-- ─── 4. Pinned messages helper: index for fast lookup ────────────────────────
CREATE INDEX IF NOT EXISTS idx_channel_messages_pinned
  ON public.channel_messages (channel_id, is_pinned)
  WHERE is_pinned = true;
