-- Real Deal Supabase schema for the Lovable transition.
-- This migration creates the durable data model but does not require
-- the current Next.js prototype to depend on Supabase at runtime.

create extension if not exists pgcrypto;

create table if not exists public.founders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  company text not null,
  operating_focus text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_pods (
  id text primary key,
  name text not null,
  focus text not null,
  description text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people (
  id text primary key,
  founder_id uuid not null references public.founders(id) on delete cascade,
  name text not null,
  role text not null,
  company text not null,
  email text,
  phone text,
  category text not null,
  pod_id text not null references public.relationship_pods(id),
  ring text not null check (ring in ('inner', 'core', 'network')),
  relationship_importance integer not null check (relationship_importance between 1 and 10),
  last_interaction_date date not null,
  cadence_days integer not null check (cadence_days > 0),
  interaction_frequency_per_month numeric(6, 2) not null default 0,
  responsiveness numeric(5, 4) not null default 0 check (responsiveness between 0 and 1),
  history_strength integer not null default 0 check (history_strength between 0 and 10),
  momentum text not null check (momentum in ('gaining', 'steady', 'softening', 'at-risk')),
  follow_up_due_date date,
  recent_opportunity text,
  next_action_commitment text,
  notes text not null default '',
  tags text[] not null default '{}',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id text primary key,
  founder_id uuid not null references public.founders(id) on delete cascade,
  title text not null,
  type text not null check (type in ('fundraising', 'hiring', 'event', 'partnership', 'customer-intros')),
  status text not null check (status in ('active', 'planning', 'paused', 'complete')),
  stage text not null,
  objective text not null,
  relevance text not null,
  due_date date not null,
  health integer not null check (health between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_targets (
  campaign_id text not null references public.campaigns(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  relevance integer not null check (relevance between 0 and 100),
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (campaign_id, person_id)
);

create table if not exists public.campaign_actions (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  label text not null,
  owner text not null,
  due_date date not null,
  status text not null check (status in ('open', 'planned', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interactions (
  id text primary key,
  person_id text not null references public.people(id) on delete cascade,
  occurred_at timestamptz not null,
  type text not null check (type in ('email', 'call', 'meeting', 'intro', 'event', 'message')),
  summary text not null,
  outcome text not null default '',
  next_step text,
  source text not null default 'manual' check (source in ('manual', 'import', 'gmail')),
  email_direction text check (email_direction in ('sent', 'received')),
  email_subject text,
  gmail_message_id text,
  gmail_thread_id text,
  raw_snippet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.founders(id) on delete cascade,
  source_name text not null,
  source_type text not null,
  imported_count integer not null default 0,
  ready_count integer not null default 0,
  review_count integer not null default 0,
  duplicate_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.email_sync_runs (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.founders(id) on delete cascade,
  account_email text,
  mode text not null default 'gmail',
  messages_imported integer not null default 0,
  matched_contacts integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.saved_dashboard_snapshots (
  id text primary key,
  founder_id uuid not null references public.founders(id) on delete cascade,
  saved_at timestamptz not null default now(),
  generated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists people_founder_id_idx on public.people(founder_id);
create index if not exists people_email_idx on public.people(lower(email)) where email is not null;
create index if not exists people_pod_id_idx on public.people(pod_id);
create index if not exists campaigns_founder_id_idx on public.campaigns(founder_id);
create index if not exists campaign_targets_person_id_idx on public.campaign_targets(person_id);
create index if not exists interactions_person_id_occurred_at_idx on public.interactions(person_id, occurred_at desc);
create index if not exists interactions_gmail_message_id_idx on public.interactions(gmail_message_id) where gmail_message_id is not null;
create index if not exists import_batches_founder_id_idx on public.import_batches(founder_id);
create index if not exists email_sync_runs_founder_id_idx on public.email_sync_runs(founder_id);
create index if not exists saved_dashboard_snapshots_founder_id_idx on public.saved_dashboard_snapshots(founder_id);

alter table public.founders enable row level security;
alter table public.relationship_pods enable row level security;
alter table public.people enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_targets enable row level security;
alter table public.campaign_actions enable row level security;
alter table public.interactions enable row level security;
alter table public.import_batches enable row level security;
alter table public.email_sync_runs enable row level security;
alter table public.saved_dashboard_snapshots enable row level security;

create policy "Authenticated users can read relationship pods"
on public.relationship_pods
for select
to authenticated
using (true);

create policy "Users can manage their founder profile"
on public.founders
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can manage their people"
on public.people
for all
to authenticated
using (
  exists (
    select 1 from public.founders
    where founders.id = people.founder_id
      and founders.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.founders
    where founders.id = people.founder_id
      and founders.owner_id = auth.uid()
  )
);

create policy "Users can manage their campaigns"
on public.campaigns
for all
to authenticated
using (
  exists (
    select 1 from public.founders
    where founders.id = campaigns.founder_id
      and founders.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.founders
    where founders.id = campaigns.founder_id
      and founders.owner_id = auth.uid()
  )
);

create policy "Users can manage their campaign targets"
on public.campaign_targets
for all
to authenticated
using (
  exists (
    select 1
    from public.campaigns
    join public.founders on founders.id = campaigns.founder_id
    where campaigns.id = campaign_targets.campaign_id
      and founders.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns
    join public.founders on founders.id = campaigns.founder_id
    where campaigns.id = campaign_targets.campaign_id
      and founders.owner_id = auth.uid()
  )
);

create policy "Users can manage their campaign actions"
on public.campaign_actions
for all
to authenticated
using (
  exists (
    select 1
    from public.campaigns
    join public.founders on founders.id = campaigns.founder_id
    where campaigns.id = campaign_actions.campaign_id
      and founders.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.campaigns
    join public.founders on founders.id = campaigns.founder_id
    where campaigns.id = campaign_actions.campaign_id
      and founders.owner_id = auth.uid()
  )
);

create policy "Users can manage their interactions"
on public.interactions
for all
to authenticated
using (
  exists (
    select 1
    from public.people
    join public.founders on founders.id = people.founder_id
    where people.id = interactions.person_id
      and founders.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.people
    join public.founders on founders.id = people.founder_id
    where people.id = interactions.person_id
      and founders.owner_id = auth.uid()
  )
);

create policy "Users can manage their import batches"
on public.import_batches
for all
to authenticated
using (
  exists (
    select 1 from public.founders
    where founders.id = import_batches.founder_id
      and founders.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.founders
    where founders.id = import_batches.founder_id
      and founders.owner_id = auth.uid()
  )
);

create policy "Users can manage their email sync runs"
on public.email_sync_runs
for all
to authenticated
using (
  exists (
    select 1 from public.founders
    where founders.id = email_sync_runs.founder_id
      and founders.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.founders
    where founders.id = email_sync_runs.founder_id
      and founders.owner_id = auth.uid()
  )
);

create policy "Users can manage their dashboard snapshots"
on public.saved_dashboard_snapshots
for all
to authenticated
using (
  exists (
    select 1 from public.founders
    where founders.id = saved_dashboard_snapshots.founder_id
      and founders.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.founders
    where founders.id = saved_dashboard_snapshots.founder_id
      and founders.owner_id = auth.uid()
  )
);

