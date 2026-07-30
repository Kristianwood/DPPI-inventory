-- ============================================================
-- DPPI Inventory — Supabase schema
-- Run this once in your NEW Supabase project:
--   Dashboard → SQL Editor → paste → Run
-- ============================================================

-- Profiles: one row per signed-up user. The FIRST person to sign up
-- becomes the owner; everyone after starts as 'viewer' until the
-- owner promotes them (Dashboard → Table Editor → profiles → role).
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, role)
  values (
    new.id,
    new.email,
    case when not exists (select 1 from public.profiles) then 'owner' else 'viewer' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- App state: the whole workspace synced as one document.
create table if not exists public.app_state (
  id int primary key check (id = 1),
  data jsonb not null,
  updated_at_ms bigint not null default 0,
  updated_by text,
  updated_at timestamptz default now()
);

-- Row Level Security -----------------------------------------
alter table public.profiles enable row level security;
alter table public.app_state enable row level security;

-- Everyone signed-in can read their own profile.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = user_id);

-- Any team member (any role) may read the workspace.
drop policy if exists "team can read state" on public.app_state;
create policy "team can read state" on public.app_state
  for select using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid())
  );

-- Only owner / admin / editor may write.
drop policy if exists "editors can write state" on public.app_state;
create policy "editors can write state" on public.app_state
  for insert with check (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('owner','admin','editor'))
  );
drop policy if exists "editors can update state" on public.app_state;
create policy "editors can update state" on public.app_state
  for update using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('owner','admin','editor'))
  );

-- Realtime: let devices hear about changes instantly.
alter publication supabase_realtime add table public.app_state;
