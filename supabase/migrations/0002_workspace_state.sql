-- Real Deal single-workspace persistence for the Vercel and Lovable transition.
-- The app writes through server-side API routes using a Supabase secret key,
-- so browser clients never receive privileged database credentials.

create table if not exists public.workspace_state (
  id text primary key,
  state_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_state enable row level security;

