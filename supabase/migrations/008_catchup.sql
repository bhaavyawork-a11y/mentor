-- ─── Mentor catch-up migration ────────────────────────────────────────────────
-- Safe to run even if some tables already exist (all use IF NOT EXISTS).
-- Run this in Supabase SQL Editor → New query → paste all → Run.

-- ─── Communities ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communities (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug            text        UNIQUE NOT NULL,
  name            text        NOT NULL,
  description     text,
  role_type       text,
  icon_color      text        DEFAULT '#FDE68A',
  member_count    int         DEFAULT 0,
  posts_this_week int         DEFAULT 0,
  rules           text[]      DEFAULT '{}',
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Communities are public" ON public.communities;
CREATE POLICY "Communities are public" ON public.communities FOR SELECT USING (true);

-- ─── Community members ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_members (
  community_id uuid        REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_refer    boolean     DEFAULT false,
  employer     text,
  role         text,
  joined_at    timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (community_id, user_id)
);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read members" ON public.community_members;
DROP POLICY IF EXISTS "Users manage own membership" ON public.community_members;
CREATE POLICY "Members can read members"    ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Users manage own membership" ON public.community_members FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add columns if table already existed without them
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS can_refer boolean DEFAULT false;
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS employer  text;
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS role      text;

-- ─── Community posts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_posts (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id     uuid        REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id          uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type             text        NOT NULL DEFAULT 'Discussion' CHECK (type IN ('Discussion','Resource','Job referral','Poll')),
  content          text        NOT NULL,
  link_url         text,
  referral_company text,
  referral_role    text,
  helpful_count    int         DEFAULT 0,
  reply_count      int         DEFAULT 0,
  created_at       timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Posts are public"     ON public.community_posts;
DROP POLICY IF EXISTS "Members can post"     ON public.community_posts;
DROP POLICY IF EXISTS "Authors can delete posts" ON public.community_posts;
CREATE POLICY "Posts are public"         ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Members can post"         ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can delete posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- ─── Referrals (invite-a-friend credits system) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referee_email  text        NOT NULL,
  status         text        DEFAULT 'Invited' CHECK (status IN ('Invited','Signed up','Booked')),
  credits_earned int         DEFAULT 0,
  created_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own referrals" ON public.referrals;
CREATE POLICY "Users see own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_id) WITH CHECK (auth.uid() = referrer_id);

-- Credits column on profiles (safe if already exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits             int      DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_companies  text[]   DEFAULT '{}';

-- ─── Post likes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid        REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read post likes"  ON public.post_likes;
DROP POLICY IF EXISTS "Users manage own post likes" ON public.post_likes;
CREATE POLICY "Anyone can read post likes"  ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own post likes" ON public.post_likes FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes (user_id);

-- ─── Post replies ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_replies (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid        REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  author_id   uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content     text        NOT NULL,
  likes_count int         DEFAULT 0,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read replies"  ON public.post_replies;
DROP POLICY IF EXISTS "Users can insert replies" ON public.post_replies;
DROP POLICY IF EXISTS "Authors can delete replies" ON public.post_replies;
CREATE POLICY "Anyone can read replies"    ON public.post_replies FOR SELECT USING (true);
CREATE POLICY "Users can insert replies"   ON public.post_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete replies" ON public.post_replies FOR DELETE USING (auth.uid() = author_id);

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
  status       text        DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Requesters see own requests" ON public.referral_requests;
DROP POLICY IF EXISTS "Authenticated users can request referrals" ON public.referral_requests;
DROP POLICY IF EXISTS "Referrers can update status" ON public.referral_requests;
CREATE POLICY "Requesters see own requests"               ON public.referral_requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = referrer_id);
CREATE POLICY "Authenticated users can request referrals" ON public.referral_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Referrers can update status"               ON public.referral_requests FOR UPDATE USING (auth.uid() = referrer_id);

CREATE INDEX IF NOT EXISTS idx_referral_requests_requester ON public.referral_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_referrer  ON public.referral_requests (referrer_id);

-- ─── Follows ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read follows"  ON public.follows;
DROP POLICY IF EXISTS "Users manage own follows" ON public.follows;
CREATE POLICY "Anyone can read follows"  ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users manage own follows" ON public.follows FOR ALL    USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id  ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows (following_id);

-- ─── Add company_domain to job_listings ───────────────────────────────────────
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS company_domain text;

-- ─── Auto-count trigger: post likes → helpful_count ──────────────────────────
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

-- ─── Auto-count trigger: post replies → reply_count ──────────────────────────
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

-- ─── Seed communities (safe — skips if slug already exists) ──────────────────
INSERT INTO public.communities (slug, name, description, role_type, icon_color, member_count, posts_this_week, rules) VALUES
  ('founders-office', 'Founders Office',    'For current and aspiring chiefs of staff, BizOps leads, and founders office professionals.',        'Founders Office / BizOps', '#FDE68A', 342,  12, ARRAY['Be specific and constructive','No job spam — use the referrals tab','Respect confidentiality','Add your role to your profile']),
  ('product-managers', 'Product Managers',  'Product folks at all stages — APM to CPO. Strategy, frameworks, case studies, and career moves.',   'Product Manager',          '#C4B5FD', 1204, 47, ARRAY['Share frameworks, not just opinions','No self-promotion without value','Tag posts with PM/Growth/Strategy','Be generous with feedback']),
  ('early-engineers',  'Early Engineers',   'SWE 0–3 years. Ask anything, share learnings, find referrals, navigate early career engineering.',  'Software Engineer (0-3 yrs)','#00C9A7', 876,  31, ARRAY['No question is too basic','Help others before asking','Share resources freely','No gatekeeping']),
  ('growth-marketing', 'Growth & Marketing','Growth, performance, brand, and content folks. Share experiments, wins, and career advice.',         'Growth / Marketing',       '#FFB5C8', 567,  19, ARRAY['Share data when you can','No agency cold pitches','Credit your sources']),
  ('vc-investing',     'VC & Investing',    'Analysts, associates, aspiring VCs, and founders fundraising. Deal flow and career transitions.',    'VC / Investing',           '#B5D5FF', 289,   8, ARRAY['No deal spam','Maintain deal confidentiality','Share your thesis']),
  ('ops-strategy',     'Operations & Strategy','Ops, strategy, and BizOps folks. Scaling operations, strategy frameworks, and career paths.',    'Operations / Strategy',    '#FFCBA4', 423,  14, ARRAY['Share playbooks and templates','Process over perfection']),
  ('data-ai',          'Data & AI',         'Data analysts, ML engineers, data scientists, and AI builders.',                                     'Data / AI / ML',           '#B5FFD9', 731,  28, ARRAY['Share code and notebooks','No AI hype without substance','Help beginners']),
  ('sales-bd',         'Sales & BD',        'SDRs, AEs, BD folks, and partnerships leads. Tactics, playbooks, and career moves.',                 'Sales / BD',               '#FFD9B5', 412,  16, ARRAY['Share what works, not just wins','No spam pitches to members'])
ON CONFLICT (slug) DO NOTHING;
