-- Salary submissions
create table if not exists public.salary_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null,
  company text,
  base_salary bigint not null,
  total_ctc bigint not null,
  variable_pct int default 0,
  stage text,
  city text,
  yoe int,
  gender text,
  created_at timestamptz default now() not null
);

alter table public.salary_data enable row level security;
create policy "Users can insert salary data" on public.salary_data for insert with check (auth.uid() = user_id);
create policy "Salary data is readable by all" on public.salary_data for select using (true);

-- Company reviews
create table if not exists public.company_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_slug text not null,
  overall_rating int not null check (overall_rating between 1 and 5),
  culture_rating int not null check (culture_rating between 1 and 5),
  wlb_rating int not null check (wlb_rating between 1 and 5),
  growth_rating int not null check (growth_rating between 1 and 5),
  comp_rating int not null check (comp_rating between 1 and 5),
  pros text,
  cons text,
  title text,
  tenure text,
  recommend boolean default true,
  created_at timestamptz default now() not null
);

alter table public.company_reviews enable row level security;
create policy "Reviews are public" on public.company_reviews for select using (true);
create policy "Users can add reviews" on public.company_reviews for insert with check (auth.uid() = user_id);
create policy "Users can delete own reviews" on public.company_reviews for delete using (auth.uid() = user_id);

-- Interview experiences
create table if not exists public.interview_experiences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_slug text not null,
  role text not null,
  rounds int,
  duration text,
  difficulty text check (difficulty in ('Easy','Medium','Hard')),
  outcome text check (outcome in ('Got offer','Rejected','Withdrew','No decision')),
  content text,
  created_at timestamptz default now() not null
);

alter table public.interview_experiences enable row level security;
create policy "Experiences are public" on public.interview_experiences for select using (true);
create policy "Users can add experiences" on public.interview_experiences for insert with check (auth.uid() = user_id);
create policy "Users can delete own experiences" on public.interview_experiences for delete using (auth.uid() = user_id);
