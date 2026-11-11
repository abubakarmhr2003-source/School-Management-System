-- School Management System: shared (platform-wide) tables.
-- Each school's own data lives in its own schema (school_<id>), created automatically by the app
-- from supabase/school_schema.sql the moment the school registers.

-- School Management System: initial schema for Supabase (PostgreSQL).
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- (Or place it under supabase/migrations and use the Supabase CLI: `supabase db push`.)

create table public.schools (
  id          integer generated always as identity primary key,
  name        text not null,
  code        text not null unique,
  status      text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  logo        text, -- small PNG/JPEG as a data: URL (resized in the browser before upload)
  created_at  timestamptz not null default now()
);

create table public.users (
  id             integer generated always as identity primary key,
  school_id      integer references public.schools(id),
  name           text not null,
  email          text not null unique,
  password_hash  text not null,
  role           text not null check (role in ('superadmin','admin','teacher','accountant','parent')),
  status         text not null default 'pending' check (status in ('pending','active','rejected')),
  created_at     timestamptz not null default now()
);
create index users_school_idx on public.users (school_id, role);

-- Failed sign-in attempts, used to slow down password guessing.
create table public.login_attempts (
  id          bigint generated always as identity primary key,
  email       text not null,
  ip          text not null,
  created_at  timestamptz not null default now()
);
create index login_attempts_email_idx on public.login_attempts (email, created_at);
create index login_attempts_ip_idx on public.login_attempts (ip, created_at);

-- Sorts roll numbers like 2, 10, 11 numerically (blank or non-numeric roll numbers sort last).
create or replace function public.roll_sort(r text)
returns integer
language sql
immutable
set search_path = ''
as $$ select nullif(left(regexp_replace(coalesce(r, ''), '[^0-9]', '', 'g'), 9), '')::integer $$;


alter table public.schools          enable row level security;
alter table public.users            enable row level security;
alter table public.login_attempts   enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
    revoke all on all functions in schema public from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
    revoke all on all sequences in schema public from authenticated;
    revoke all on all functions in schema public from authenticated;
  end if;
end $$;
