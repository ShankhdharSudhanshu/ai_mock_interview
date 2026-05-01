-- ============================================================
-- Real-time AI Voice Agent Interview Platform — Supabase Database Schema
-- Run this in your Supabase project → SQL Editor → New Query
-- ============================================================

-- ── Profiles (extends Supabase auth.users) ──────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  bio         text,
  skills      text[]   default '{}',
  resume_url  text,
  role        text     not null default 'candidate' check (role in ('candidate','admin')),
  plan        text     not null default 'free'      check (plan in ('free','pro','enterprise')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Interviews ───────────────────────────────────────────────
create table if not exists public.interviews (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  category    text not null,
  score       numeric(4,2) default 0,
  answers     jsonb default '[]'::jsonb,
  created_at  timestamptz default now()
);

-- ── RLS Policies ─────────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.interviews enable row level security;

-- Profiles: users can read/update their own
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Interviews: users can CRUD their own
create policy "interviews_select_own" on public.interviews
  for select using (auth.uid() = user_id);

create policy "interviews_insert_own" on public.interviews
  for insert with check (auth.uid() = user_id);

create policy "interviews_delete_own" on public.interviews
  for delete using (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists interviews_user_id_idx on public.interviews (user_id);
create index if not exists interviews_created_at_idx on public.interviews (created_at desc);

-- ── Feedback ─────────────────────────────────────────────────
create table if not exists public.feedback (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id),
  overall_rating    int  check (overall_rating between 1 and 5),
  ai_quality_rating int  check (ai_quality_rating between 1 and 5),
  track             text,
  message           text not null,
  recommend         text,
  name              text,
  email             text,
  created_at        timestamptz default now()
);

alter table public.feedback enable row level security;

-- Anyone (including anon) can insert feedback
create policy "feedback_insert_anyone" on public.feedback
  for insert with check (true);

-- Users can read their own feedback
create policy "feedback_select_own" on public.feedback
  for select using (auth.uid() = user_id);

