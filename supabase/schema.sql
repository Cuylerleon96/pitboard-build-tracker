create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('shop', 'customer')),
  full_name text not null default '',
  shop_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  vehicle text not null,
  status text not null default 'Planning',
  brief text not null default '',
  next_milestone text not null default '',
  portal_summary text not null default '',
  budget_target numeric not null default 0,
  client jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists builds_owner_slug_idx on public.builds (owner_id, slug);
create index if not exists builds_owner_updated_idx on public.builds (owner_id, updated_at desc);
create index if not exists builds_client_email_idx on public.builds ((lower(coalesce(client ->> 'email', ''))));

alter table public.profiles enable row level security;
alter table public.builds enable row level security;

drop policy if exists "owners can read their builds" on public.builds;
drop policy if exists "owners can insert their builds" on public.builds;
drop policy if exists "owners can update their builds" on public.builds;
drop policy if exists "owners can delete their builds" on public.builds;
drop policy if exists "users can read their own profile" on public.profiles;
drop policy if exists "users can insert their own profile" on public.profiles;
drop policy if exists "users can update their own profile" on public.profiles;

create policy "users can read their own profile" on public.profiles
for select using (auth.uid() = id);

create policy "users can insert their own profile" on public.profiles
for insert with check (auth.uid() = id);

create policy "users can update their own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "shops and linked customers can read builds" on public.builds
for select using (
  auth.uid() = owner_id
  or lower(coalesce(client ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "owners can insert their builds" on public.builds
for insert with check (auth.uid() = owner_id);

create policy "owners can update their builds" on public.builds
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "owners can delete their builds" on public.builds
for delete using (auth.uid() = owner_id);
