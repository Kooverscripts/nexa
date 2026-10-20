-- NEXA social foundation: friendships, conversations, members, and messages.
-- Run after 0001_foundation.sql. All writes/read operations go through authenticated server routes.

create table if not exists public.nexa_friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.nexa_users(id) on delete cascade,
  receiver_id uuid not null references public.nexa_users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nexa_friend_requests_not_self check (sender_id <> receiver_id),
  constraint nexa_friend_requests_pair_unique unique (sender_id, receiver_id)
);
create index if not exists nexa_friend_requests_receiver_status_idx on public.nexa_friend_requests(receiver_id, status, created_at desc);
create index if not exists nexa_friend_requests_sender_status_idx on public.nexa_friend_requests(sender_id, status, created_at desc);

create table if not exists public.nexa_friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.nexa_users(id) on delete cascade,
  user_b uuid not null references public.nexa_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint nexa_friendships_ordered check (user_a < user_b),
  constraint nexa_friendships_pair_unique unique (user_a, user_b)
);
create index if not exists nexa_friendships_user_a_idx on public.nexa_friendships(user_a);
create index if not exists nexa_friendships_user_b_idx on public.nexa_friendships(user_b);

create table if not exists public.nexa_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct','group')),
  title text,
  direct_key text unique,
  created_by uuid not null references public.nexa_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint nexa_conversation_direct_key_check check ((kind = 'direct' and direct_key is not null) or (kind = 'group' and direct_key is null)),
  constraint nexa_conversation_title_length check (title is null or char_length(title) between 1 and 80)
);
create index if not exists nexa_conversations_created_at_idx on public.nexa_conversations(created_at desc);

create table if not exists public.nexa_conversation_members (
  conversation_id uuid not null references public.nexa_conversations(id) on delete cascade,
  user_id uuid not null references public.nexa_users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create index if not exists nexa_conversation_members_user_idx on public.nexa_conversation_members(user_id, joined_at desc);

create table if not exists public.nexa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.nexa_conversations(id) on delete cascade,
  sender_id uuid not null references public.nexa_users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint nexa_messages_body_length check (char_length(body) between 1 and 4000)
);
create index if not exists nexa_messages_conversation_created_idx on public.nexa_messages(conversation_id, created_at desc);

-- These tables intentionally have no browser policies. Only server routes using the
-- service-role key may access them, after verifying the user's signed session and membership.
alter table public.nexa_friend_requests enable row level security;
alter table public.nexa_friendships enable row level security;
alter table public.nexa_conversations enable row level security;
alter table public.nexa_conversation_members enable row level security;
alter table public.nexa_messages enable row level security;
revoke all on public.nexa_friend_requests, public.nexa_friendships, public.nexa_conversations,
  public.nexa_conversation_members, public.nexa_messages from anon, authenticated;
