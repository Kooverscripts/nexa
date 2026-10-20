-- NEXA foundation schema. Run in Supabase SQL Editor or with Supabase CLI.
-- This project uses custom username/password sessions, not Supabase Auth.
-- The service-role key is server-only; all browser access to these tables is denied by RLS.

create extension if not exists pgcrypto;

create table if not exists public.nexa_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  account_number text not null,
  password_hash text not null,
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  banner_url text,
  is_disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nexa_users_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint nexa_users_account_number_format check (account_number ~ '^[0-9]{4}-[0-9]{4}$'),
  constraint nexa_users_display_name_length check (char_length(display_name) between 1 and 40),
  constraint nexa_users_bio_length check (char_length(bio) <= 240)
);

create unique index if not exists nexa_users_username_unique on public.nexa_users (username);
create unique index if not exists nexa_users_account_number_unique on public.nexa_users (account_number);
create index if not exists nexa_users_created_at_idx on public.nexa_users (created_at desc);

create or replace function public.nexa_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists nexa_users_updated_at on public.nexa_users;
create trigger nexa_users_updated_at before update on public.nexa_users
for each row execute function public.nexa_set_updated_at();

alter table public.nexa_users enable row level security;
-- No policies intentionally: browser/anon/authenticated roles cannot read or write rows.
-- Server API uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS; enforce authorization there.

revoke all on public.nexa_users from anon, authenticated;
grant usage on schema public to anon, authenticated;
-- Do not grant direct table access to anon/authenticated.
