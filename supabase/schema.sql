create extension if not exists pgcrypto;

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

alter table public.builds enable row level security;

create policy "owners can read their builds" on public.builds for select using (auth.uid() = owner_id);
create policy "owners can insert their builds" on public.builds for insert with check (auth.uid() = owner_id);
create policy "owners can update their builds" on public.builds for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners can delete their builds" on public.builds for delete using (auth.uid() = owner_id);
