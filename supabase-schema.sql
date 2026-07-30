-- ============================================================
-- DPPI Inventory — Supabase schema (v2, safe to re-run)
-- Dashboard → SQL Editor → paste this whole file → Run
-- ============================================================

-- Profiles: one row per signed-up user.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz default now()
);

-- Invites: the app writes a row here when the owner adds a person by email.
-- When that email signs up, they get this role automatically.
create table if not exists public.invites (
  email text primary key,
  role text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  invited_at timestamptz default now()
);

-- Current user's role, RLS-safe (security definer avoids policy recursion).
create or replace function public.my_role()
returns text language sql security definer stable set search_path = public as
$$ select role from public.profiles where user_id = auth.uid() $$;

-- New signup: use the invited role if there is one; the very first user
-- becomes the owner; anyone else defaults to read-only viewer.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  select role into v_role from public.invites where lower(email) = lower(new.email);
  insert into public.profiles (user_id, email, role)
  values (
    new.id,
    new.email,
    coalesce(
      v_role,
      case when not exists (select 1 from public.profiles) then 'owner' else 'viewer' end
    )
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
alter table public.invites enable row level security;
alter table public.app_state enable row level security;

-- Everyone signed-in can read their own profile.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = user_id);

-- Owner/admin can see and change everyone's role (in-app team management).
drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles
  for select using (public.my_role() in ('owner','admin'));
drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles" on public.profiles
  for update using (public.my_role() in ('owner','admin'));

-- Owner/admin manage invites.
drop policy if exists "admins manage invites" on public.invites;
create policy "admins manage invites" on public.invites
  for all using (public.my_role() in ('owner','admin'))
  with check (public.my_role() in ('owner','admin'));

-- Any team member (any role) may read the workspace.
drop policy if exists "team can read state" on public.app_state;
create policy "team can read state" on public.app_state
  for select using (public.my_role() is not null);

-- Only owner / admin / editor may write.
drop policy if exists "editors can write state" on public.app_state;
create policy "editors can write state" on public.app_state
  for insert with check (public.my_role() in ('owner','admin','editor'));
drop policy if exists "editors can update state" on public.app_state;
create policy "editors can update state" on public.app_state
  for update using (public.my_role() in ('owner','admin','editor'));

-- Realtime: let devices hear about changes instantly (no-op if already added).
do $$ begin
  alter publication supabase_realtime add table public.app_state;
exception when duplicate_object then null; end $$;
