-- ─── Migration 007: Feed social tables ─────────────────────────────────────
-- Run in Supabase SQL Editor (Project: tvlqmghozpcpoygvlzrp)

-- ─── Post likes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      uuid        REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read post likes"    ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own post likes"   ON public.post_likes FOR ALL   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes (user_id);

-- ─── Post replies ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_replies (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      uuid        REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  author_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content      text        NOT NULL,
  likes_count  int         DEFAULT 0,
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read replies"       ON public.post_replies FOR SELECT USING (true);
CREATE POLICY "Users can insert replies"      ON public.post_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete replies"    ON public.post_replies FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_post_replies_post_id ON public.post_replies (post_id);

-- ─── Referral requests (job referrals inside communities) ─────────────────────
CREATE TABLE IF NOT EXISTS public.referral_requests (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referrer_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid        REFERENCES public.communities(id) ON DELETE CASCADE,
  post_id      uuid        REFERENCES public.community_posts(id) ON DELETE SET NULL,
  company      text        NOT NULL,
  role         text,
  message      text,
  status       text        DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requesters see own requests"   ON public.referral_requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = referrer_id);
CREATE POLICY "Authenticated users can request referrals" ON public.referral_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Referrers can update status"   ON public.referral_requests FOR UPDATE USING (auth.uid() = referrer_id);

CREATE INDEX IF NOT EXISTS idx_referral_requests_requester ON public.referral_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_referrer  ON public.referral_requests (referrer_id);

-- ─── Follows ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read follows"    ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users manage own follows"   ON public.follows FOR ALL   USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id  ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows (following_id);

-- ─── Add company_domain to job_listings ───────────────────────────────────────
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS company_domain text;

-- ─── Add can_refer flag to community_members ──────────────────────────────────
-- (lets members mark themselves as able to refer at their employer)
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS can_refer  boolean DEFAULT false;
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS employer   text;
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS role       text;

-- ─── Trigger: keep helpful_count in sync with post_likes ──────────────────────
CREATE OR REPLACE FUNCTION sync_post_helpful_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET helpful_count = helpful_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_post_helpful_count ON public.post_likes;
CREATE TRIGGER trg_sync_post_helpful_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_helpful_count();

-- ─── Trigger: keep reply_count in sync with post_replies ──────────────────────
CREATE OR REPLACE FUNCTION sync_post_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_post_reply_count ON public.post_replies;
CREATE TRIGGER trg_sync_post_reply_count
  AFTER INSERT OR DELETE ON public.post_replies
  FOR EACH ROW EXECUTE FUNCTION sync_post_reply_count();
