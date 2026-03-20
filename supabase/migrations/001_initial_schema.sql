-- ============================================================
-- Mentor Platform — Supabase Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- USERS (mirrors auth.users, extended profile data)
-- ──────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text not null,
  full_name     text,
  avatar_url    text,
  linkedin_url  text,
  -- Career info
  current_job_role  text,
  target_role   text,
  current_salary numeric(12,2),
  target_salary  numeric(12,2),
  years_experience integer default 0,
  industry      text,
  location      text,
  bio           text,
  -- Skills stored as text array
  skills        text[] default '{}',
  -- Timestamps
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ──────────────────────────────────────────────────────────
-- GOALS
-- ──────────────────────────────────────────────────────────
create table public.goals (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  title         text not null,
  description   text,
  category      text check (category in ('role', 'skill', 'salary', 'network', 'education', 'other')) default 'other',
  status        text check (status in ('active', 'completed', 'paused', 'cancelled')) default 'active',
  priority      text check (priority in ('high', 'medium', 'low')) default 'medium',
  target_date   date,
  completed_at  timestamptz,
  milestones    jsonb default '[]',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.goals enable row level security;

create policy "Users can manage their own goals"
  on public.goals for all
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- EXPERTS
-- ──────────────────────────────────────────────────────────
create table public.experts (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete set null,
  full_name       text not null,
  avatar_url      text,
  headline        text,
  bio             text,
  linkedin_url    text,
  expertise_areas text[] default '{}',
  industries      text[] default '{}',
  years_experience integer default 0,
  rating          numeric(3,2) default 0 check (rating >= 0 and rating <= 5),
  review_count    integer default 0,
  is_verified     boolean default false,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.experts enable row level security;

create policy "Experts are publicly viewable"
  on public.experts for select
  using (is_active = true);

-- ──────────────────────────────────────────────────────────
-- SERVICES (what experts offer)
-- ──────────────────────────────────────────────────────────
create table public.services (
  id              uuid default uuid_generate_v4() primary key,
  expert_id       uuid references public.experts(id) on delete cascade not null,
  title           text not null,
  description     text,
  type            text check (type in ('session', 'review', 'course', 'package')) default 'session',
  duration_mins   integer default 60,
  price_cents     integer not null,
  currency        text default 'usd',
  stripe_price_id text,
  max_bookings    integer,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.services enable row level security;

create policy "Services are publicly viewable"
  on public.services for select
  using (is_active = true);

-- ──────────────────────────────────────────────────────────
-- BOOKINGS
-- ──────────────────────────────────────────────────────────
create table public.bookings (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references public.profiles(id) on delete cascade not null,
  expert_id            uuid references public.experts(id) on delete cascade not null,
  service_id           uuid references public.services(id) on delete cascade not null,
  status               text check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')) default 'pending',
  scheduled_at         timestamptz,
  duration_mins        integer,
  notes                text,
  -- Payment
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_cents         integer,
  currency             text default 'usd',
  paid_at              timestamptz,
  -- Meeting
  meeting_url          text,
  -- Timestamps
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table public.bookings enable row level security;

create policy "Users can view their own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy "Users can create bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookings"
  on public.bookings for update
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- HELPER: auto-update updated_at
-- ──────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at();

create trigger goals_updated_at before update on public.goals
  for each row execute function update_updated_at();

create trigger experts_updated_at before update on public.experts
  for each row execute function update_updated_at();

create trigger services_updated_at before update on public.services
  for each row execute function update_updated_at();

create trigger bookings_updated_at before update on public.bookings
  for each row execute function update_updated_at();

-- ──────────────────────────────────────────────────────────
-- SEED: sample experts
-- ──────────────────────────────────────────────────────────
insert into public.experts (full_name, headline, bio, expertise_areas, industries, years_experience, rating, review_count, is_verified) values
  (
    'Sarah Chen',
    'VP of Engineering → CTO Coach',
    'Former CTO at two Series B startups. I help senior engineers navigate the path to technical leadership and executive roles.',
    array['Engineering Leadership', 'CTO Transition', 'Technical Strategy', 'Team Building'],
    array['Technology', 'SaaS', 'Fintech'],
    14, 4.9, 87, true
  ),
  (
    'Marcus Williams',
    'Product Strategy & Growth',
    'Led product at Stripe and Notion. Specialising in 0→1 product development and career pivots into product management.',
    array['Product Management', 'Growth Strategy', 'Career Pivot', 'Startups'],
    array['Technology', 'B2B SaaS', 'Consumer'],
    11, 4.8, 62, true
  ),
  (
    'Priya Sharma',
    'Data Science & ML Career Expert',
    'Staff Data Scientist at Google. Helping analysts and engineers break into ML roles at top tech companies.',
    array['Data Science', 'Machine Learning', 'Interview Prep', 'FAANG'],
    array['Technology', 'AI/ML', 'Research'],
    9, 4.7, 45, true
  ),
  (
    'James O''Brien',
    'Finance → Tech Transition Specialist',
    'Made the jump from Goldman Sachs to fintech. Now helping finance professionals transition into technology roles.',
    array['Career Transition', 'Fintech', 'Financial Services', 'Resume Review'],
    array['Finance', 'Fintech', 'Consulting'],
    12, 4.6, 38, false
  );
