-- Applications table for the job application tracker
create table if not exists public.applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company text not null,
  role text not null,
  url text,
  status text not null default 'Applied'
    check (status in ('Applied', 'Interviewing', 'Offer', 'Rejected')),
  applied_date date not null default current_date,
  notes text,
  updated_at timestamptz default now() not null
);

alter table public.applications enable row level security;

create policy "Users can manage their own applications"
  on public.applications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index applications_user_id_idx on public.applications(user_id);
create index applications_status_idx on public.applications(status);
