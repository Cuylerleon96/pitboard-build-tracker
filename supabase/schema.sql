create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null check (role in ('shop', 'customer')),
  is_admin boolean not null default false,
  full_name text not null default '',
  shop_name text not null default '',
  tier text not null default 'free' check (tier in ('free', 'garage', 'shop')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists shop_name text not null default '';
alter table public.profiles add column if not exists tier text not null default 'free' check (tier in ('free', 'garage', 'shop'));
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

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

create or replace function public.has_shop_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where role = 'shop' and is_admin = true
  );
$$;

create or replace function public.current_user_is_shop_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid() and role = 'shop' and is_admin = true
  );
$$;

grant execute on function public.has_shop_admin() to anon, authenticated;
grant execute on function public.current_user_is_shop_admin() to authenticated;

-- Drop all known policy variants (handles both old simple names and new granular names)
drop policy if exists "builds_owner_only" on public.builds;
drop policy if exists "profiles_self" on public.profiles;
drop policy if exists "profiles_admin_read" on public.profiles;
drop policy if exists "profiles_admin_write" on public.profiles;
drop policy if exists "owners can read their builds" on public.builds;
drop policy if exists "shops and linked customers can read builds" on public.builds;
drop policy if exists "owners can insert their builds" on public.builds;
drop policy if exists "owners can update their builds" on public.builds;
drop policy if exists "owners can delete their builds" on public.builds;
drop policy if exists "users can read their own profile" on public.profiles;
drop policy if exists "users can insert their own profile" on public.profiles;
drop policy if exists "users can update their own profile" on public.profiles;
drop policy if exists "shop admins can read all profiles" on public.profiles;
drop policy if exists "shop admins can update all profiles" on public.profiles;

create policy "users can read their own profile" on public.profiles
for select using (auth.uid() = id);

create policy "shop admins can read all profiles" on public.profiles
for select using (public.current_user_is_shop_admin());

create policy "users can insert their own profile" on public.profiles
for insert with check (
  auth.uid() = id
  and (
    (role = 'customer' and is_admin = false)
    or (role = 'shop' and is_admin = true and not public.has_shop_admin())
  )
);

create policy "users can update their own profile" on public.profiles
for update using (auth.uid() = id)
with check (
  auth.uid() = id
  -- users cannot change their own role, admin status, or billing fields
  and role = (select existing.role from public.profiles as existing where existing.id = auth.uid())
  and is_admin = (select existing.is_admin from public.profiles as existing where existing.id = auth.uid())
  and tier = (select existing.tier from public.profiles as existing where existing.id = auth.uid())
  and coalesce(stripe_customer_id, '') = coalesce((select existing.stripe_customer_id from public.profiles as existing where existing.id = auth.uid()), '')
);

create policy "shop admins can update all profiles" on public.profiles
for update using (public.current_user_is_shop_admin())
with check (public.current_user_is_shop_admin());

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
