-- Communities
create table if not exists public.communities (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  description text,
  role_type text,
  icon_color text default '#FDE68A',
  member_count int default 0,
  posts_this_week int default 0,
  rules text[] default '{}',
  created_at timestamptz default now() not null
);

create table if not exists public.community_members (
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (community_id, user_id)
);

create table if not exists public.community_posts (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null default 'Discussion' check (type in ('Discussion','Resource','Job referral','Poll')),
  content text not null,
  link_url text,
  referral_company text,
  referral_role text,
  helpful_count int default 0,
  reply_count int default 0,
  created_at timestamptz default now() not null
);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;

create policy "Communities are public" on public.communities for select using (true);
create policy "Members can read members" on public.community_members for select using (true);
create policy "Users manage own membership" on public.community_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Posts are public" on public.community_posts for select using (true);
create policy "Members can post" on public.community_posts for insert with check (auth.uid() = user_id);
create policy "Authors can delete posts" on public.community_posts for delete using (auth.uid() = user_id);

-- Seed communities
insert into public.communities (slug, name, description, role_type, icon_color, member_count, posts_this_week, rules) values
  ('founders-office', 'Founders Office', 'For current and aspiring chiefs of staff, BizOps leads, and founders office professionals navigating high-stakes roles.', 'Founders Office / BizOps', '#FDE68A', 342, 12, ARRAY['Be specific and constructive','No job spam — use the referrals tab','Respect confidentiality','Add your role to your profile']),
  ('product-managers', 'Product Managers', 'Product folks at all stages — from APM to CPO. Discuss strategy, frameworks, case studies, and career moves.', 'Product Manager', '#C4B5FD', 1204, 47, ARRAY['Share frameworks, not just opinions','No self-promotion without adding value','Tag posts with PM/Growth/Strategy','Be generous with feedback']),
  ('early-engineers', 'Early Engineers', 'SWE 0–3 years experience. Ask anything, share learnings, find referrals, and navigate the early years of your engineering career.', 'Software Engineer (0-3 yrs)', '#00C9A7', 876, 31, ARRAY['No question is too basic','Help others before asking','Share resources freely','No gatekeeping']),
  ('growth-marketing', 'Growth & Marketing', 'Growth, performance marketing, brand, and content folks. Share experiments, wins, and career advice.', 'Growth / Marketing', '#FFB5C8', 567, 19, ARRAY['Share data when you can','Attribution debates welcome','No agency cold pitches','Credit your sources']),
  ('vc-investing', 'VC & Investing', 'Analysts, associates, aspiring VCs, and founders fundraising. Deal flow, fund strategies, and career transitions.', 'VC / Investing', '#B5D5FF', 289, 8, ARRAY['No deal spam','Maintain deal confidentiality','Introductions welcome','Share your thesis, not just headlines']),
  ('ops-strategy', 'Operations & Strategy', 'Ops, strategy, and BizOps folks. Discuss scaling operations, strategy frameworks, and career paths.', 'Operations / Strategy', '#FFCBA4', 423, 14, ARRAY['Share playbooks and templates','Process over perfection','No consulting cold pitches','Help others scale']),
  ('data-ai', 'Data & AI', 'Data analysts, ML engineers, data scientists, and AI builders. Discuss tools, models, career paths, and the latest in AI.', 'Data / AI / ML', '#B5FFD9', 731, 28, ARRAY['Share code and notebooks','Reproducibility matters','No AI hype without substance','Help beginners']),
  ('sales-bd', 'Sales & BD', 'SDRs, AEs, BD folks, and partnerships leads. Share tactics, playbooks, quota achievers, and career moves.', 'Sales / BD', '#FFD9B5', 412, 16, ARRAY['Share what works, not just wins','Respect competitive intel','No spam pitches to members','Be honest about targets'])
on conflict (slug) do nothing;

-- Referrals
create table if not exists public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referee_email text not null,
  status text default 'Invited' check (status in ('Invited','Signed up','Booked')),
  credits_earned int default 0,
  created_at timestamptz default now() not null
);

alter table public.referrals enable row level security;
create policy "Users see own referrals" on public.referrals for all using (auth.uid() = referrer_id) with check (auth.uid() = referrer_id);

-- Credits column on profiles
alter table public.profiles add column if not exists credits int default 0;
alter table public.profiles add column if not exists referral_companies text[] default '{}';
