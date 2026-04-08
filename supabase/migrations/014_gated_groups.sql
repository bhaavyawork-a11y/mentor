-- ─────────────────────────────────────────────────────────────────────────────
-- 014: Gated groups — verification, applications, channel types
-- Transforms communities into exclusive, gated groups with AI-powered screening.
-- Safe to re-run — all use IF NOT EXISTS / IF EXISTS / ON CONFLICT guards.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Communities: add verification + screening questions ──────────────────
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS requires_verification boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS screening_questions   jsonb   DEFAULT '[]';

-- ─── 2. Community members: add status + role/employer if missing ─────────────
ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS status   text DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS can_refer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS employer  text,
  ADD COLUMN IF NOT EXISTS role      text;

-- Existing members are already approved (they joined before verification existed)
UPDATE public.community_members SET status = 'approved' WHERE status IS NULL;

-- ─── 3. Community applications table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_applications (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  community_id uuid        REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  answers      jsonb       NOT NULL DEFAULT '{}',
  status       text        DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ai_score     integer,
  ai_feedback  text,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, community_id)
);

ALTER TABLE public.community_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own applications"   ON public.community_applications;
DROP POLICY IF EXISTS "Users submit applications"    ON public.community_applications;
DROP POLICY IF EXISTS "System updates applications"  ON public.community_applications;

CREATE POLICY "Users see own applications"
  ON public.community_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users submit applications"
  ON public.community_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System updates applications"
  ON public.community_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_applications_user
  ON public.community_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_community_applications_community
  ON public.community_applications (community_id, status);

-- ─── 4. Community channels: add channel_type + allowed_post_types ────────────
ALTER TABLE public.community_channels
  ADD COLUMN IF NOT EXISTS channel_type       text DEFAULT 'discussions'
    CHECK (channel_type IN ('discussions', 'upskilling', 'referrals', 'job_board')),
  ADD COLUMN IF NOT EXISTS allowed_post_types text[] DEFAULT ARRAY['Discussion'];

-- ─── 5. Community posts: add channel_type to link posts to channels ───────────
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS channel_type text DEFAULT 'discussions'
    CHECK (channel_type IN ('discussions', 'upskilling', 'referrals', 'job_board'));

-- Also expand the post type check to include Job Listing
ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_type_check
    CHECK (type IN ('Discussion', 'Resource', 'Job referral', 'Poll', 'Job Listing', 'Referral', 'Course', 'Event'));

-- ─── 6. Replace seeded channels with the 4 canonical channel types ────────────
-- Delete old non-canonical channel slugs (casual, work-talk)
DELETE FROM public.community_channels WHERE slug IN ('casual', 'work-talk');

-- Update referrals channel to have correct channel_type
UPDATE public.community_channels
  SET channel_type = 'referrals',
      allowed_post_types = ARRAY['Referral', 'Job referral'],
      name = 'Referrals',
      emoji = '🤝',
      description = 'Job referrals, hiring opportunities, and warm intros',
      position = 2
  WHERE slug = 'referrals';

-- Update upskilling channel
UPDATE public.community_channels
  SET channel_type = 'upskilling',
      allowed_post_types = ARRAY['Resource', 'Course', 'Event', 'Discussion'],
      name = 'Upskilling',
      emoji = '📚',
      description = 'Courses, certifications, resources, and skill building',
      position = 1
  WHERE slug = 'upskilling';

-- Insert Discussions channel (the main discussion space)
INSERT INTO public.community_channels (community_id, name, slug, emoji, description, channel_type, allowed_post_types, position)
SELECT c.id, 'Discussions', 'discussions', '💬',
       'General discussion, questions, and community conversation',
       'discussions', ARRAY['Discussion', 'Poll'], 0
FROM public.communities c
ON CONFLICT (community_id, slug) DO UPDATE
  SET channel_type = 'discussions',
      allowed_post_types = ARRAY['Discussion', 'Poll'],
      position = 0;

-- Insert Job Board channel
INSERT INTO public.community_channels (community_id, name, slug, emoji, description, channel_type, allowed_post_types, position)
SELECT c.id, 'Job Board', 'job-board', '💼',
       'Job listings, open roles, and hiring announcements',
       'job_board', ARRAY['Job Listing', 'Job referral'], 3
FROM public.communities c
ON CONFLICT (community_id, slug) DO UPDATE
  SET channel_type = 'job_board',
      allowed_post_types = ARRAY['Job Listing', 'Job referral'],
      position = 3;

-- ─── 7. Seed screening questions per community ───────────────────────────────
UPDATE public.communities SET
  requires_verification = true,
  screening_questions = '[
    {"id":"q1","question":"Describe a product you built or improved. What was the biggest challenge and how did you measure success?","placeholder":"e.g. I led the redesign of our checkout flow, reducing drop-off by 18%..."},
    {"id":"q2","question":"Walk us through how you prioritize features. What framework or approach do you use and why?","placeholder":"e.g. I use RICE scoring combined with customer interviews..."},
    {"id":"q3","question":"Give an example of when you had to push back on stakeholder requests. What happened and what was the outcome?","placeholder":"e.g. Engineering wanted to delay the launch but I negotiated a scoped MVP..."}
  ]'::jsonb
WHERE slug = 'product-managers';

UPDATE public.communities SET
  requires_verification = true,
  screening_questions = '[
    {"id":"q1","question":"What does a Chief of Staff or Founders Office role actually involve day-to-day in your experience?","placeholder":"e.g. I manage the CEO''s priorities, run weekly leadership meetings, and own special projects..."},
    {"id":"q2","question":"Describe a time you had to operate with high ambiguity. How did you structure your work?","placeholder":"e.g. When we had no roadmap for the new division, I interviewed 10 stakeholders and..."},
    {"id":"q3","question":"How do you manage your principal''s time and strategic priorities under pressure?","placeholder":"e.g. I do a weekly priorities review with the CEO and guard their calendar by..."}
  ]'::jsonb
WHERE slug = 'founders-office';

UPDATE public.communities SET
  requires_verification = true,
  screening_questions = '[
    {"id":"q1","question":"What''s the most interesting technical problem you''ve worked on? Describe the challenge and your approach.","placeholder":"e.g. I optimised a slow database query that was timing out on 100k rows by..."},
    {"id":"q2","question":"How do you approach debugging a production issue? Walk us through your process.","placeholder":"e.g. I start with logs, then check recent deploys, then isolate with feature flags..."},
    {"id":"q3","question":"What technologies or stack are you currently working with professionally?","placeholder":"e.g. React, Node.js, PostgreSQL, deployed on AWS with CI/CD via GitHub Actions..."}
  ]'::jsonb
WHERE slug = 'early-engineers';

UPDATE public.communities SET
  requires_verification = true,
  screening_questions = '[
    {"id":"q1","question":"Describe a growth experiment you ran. What was the hypothesis, how did you test it, and what was the result?","placeholder":"e.g. We tested a referral loop on the signup page and saw a 22% lift in..."},
    {"id":"q2","question":"How do you think about attribution in a multi-touch marketing funnel?","placeholder":"e.g. I use a combination of first-touch, last-touch, and time-decay depending on..."},
    {"id":"q3","question":"What growth or marketing channels have you owned and what metrics were you responsible for?","placeholder":"e.g. I owned paid social (Meta + Google), CAC target of $40, managed $200k monthly budget..."}
  ]'::jsonb
WHERE slug = 'growth-marketing';

UPDATE public.communities SET
  requires_verification = true,
  screening_questions = '[
    {"id":"q1","question":"Describe your investment thesis or a company you find compelling right now. Why?","placeholder":"e.g. I''m focused on vertical SaaS in logistics because the incumbents are fragmented and..."},
    {"id":"q2","question":"How do you evaluate a founding team during diligence? What signals matter most to you?","placeholder":"e.g. I look for domain expertise, complementary skills, and evidence of execution under adversity..."},
    {"id":"q3","question":"What stage and sector are you focused on, and what''s your current role in the ecosystem?","placeholder":"e.g. I''m an Associate at a Series A fund focused on B2B SaaS in APAC..."}
  ]'::jsonb
WHERE slug = 'vc-investing';

UPDATE public.communities SET
  requires_verification = true,
  screening_questions = '[
    {"id":"q1","question":"Describe a process you designed or significantly improved. What was the before/after and how did you measure impact?","placeholder":"e.g. I rebuilt our vendor onboarding process, cutting time from 3 weeks to 5 days..."},
    {"id":"q2","question":"Walk us through how you approach a strategic planning exercise from scratch.","placeholder":"e.g. I start with a situation analysis, define the north star, then work backwards with OKRs..."},
    {"id":"q3","question":"What''s the most complex operational or strategy challenge you''ve owned?","placeholder":"e.g. I managed the integration of an acquired company into our operations over 6 months..."}
  ]'::jsonb
WHERE slug = 'ops-strategy';

UPDATE public.communities SET
  requires_verification = true,
  screening_questions = '[
    {"id":"q1","question":"Describe a data analysis or ML project you worked on. What was the business question and impact?","placeholder":"e.g. I built a churn prediction model that reduced 6-month churn by 14% by identifying at-risk users..."},
    {"id":"q2","question":"How do you communicate data insights or model results to non-technical stakeholders?","placeholder":"e.g. I translate outputs into business impact using visualisations and avoid jargon by..."},
    {"id":"q3","question":"What tools, languages, and frameworks are you using professionally right now?","placeholder":"e.g. Python, SQL, dbt, BigQuery, LLM fine-tuning with HuggingFace..."}
  ]'::jsonb
WHERE slug = 'data-ai';

UPDATE public.communities SET
  requires_verification = true,
  screening_questions = '[
    {"id":"q1","question":"Walk us through your sales process end-to-end — from prospecting to close.","placeholder":"e.g. I start with ICP research on LinkedIn, personalise outreach, run discovery calls, then..."},
    {"id":"q2","question":"What''s your approach to handling objections? Give a real example.","placeholder":"e.g. When prospects say it''s too expensive I reframe value by asking about the cost of not solving..."},
    {"id":"q3","question":"Describe the most complex deal or partnership you''ve closed. What made it hard and what was the outcome?","placeholder":"e.g. I closed a $500k enterprise deal in a 9-month cycle involving 6 stakeholders..."}
  ]'::jsonb
WHERE slug = 'sales-bd';

-- ─── 8. Index for fast feed queries (posts by channel_type + community) ───────
CREATE INDEX IF NOT EXISTS idx_community_posts_channel_type
  ON public.community_posts (channel_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_community_channel
  ON public.community_posts (community_id, channel_type, created_at DESC);

-- ─── 9. Update RLS on community_members to handle status ─────────────────────
-- Members with 'approved' status can post in communities they belong to
DROP POLICY IF EXISTS "Users manage own membership" ON public.community_members;
CREATE POLICY "Users manage own membership"
  ON public.community_members FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
