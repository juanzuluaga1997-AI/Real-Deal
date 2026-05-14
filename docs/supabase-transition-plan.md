# Supabase Transition Plan

Supabase should be introduced when Real Deal moves from a prototype/demo into a durable multi-user product. The current app can keep running without Supabase, but Lovable should use Supabase for production persistence.

## Why Supabase

Real Deal needs durable storage for relationship data, imported contacts, campaign state, Gmail-derived email history, saved dashboards, and future authentication. Supabase gives Lovable a PostgreSQL database, authentication, row-level security, storage, and edge functions without adding a separate custom backend first.

## Recommended Data Ownership

Each founder owns a Real Deal workspace. The `founders` table includes `owner_id`, which references `auth.users(id)`. Tables that belong to a founder link back through `founder_id`; interaction rows link through a person, and each person links to a founder.

This keeps row-level security simple:

- A signed-in user can read and modify only their own founder profile.
- A signed-in user can read and modify only people, campaigns, interactions, import batches, sync runs, and snapshots that belong to their founder profile.
- Service-role access is reserved for trusted server-side jobs only.

## Migration File

Run this migration in the Supabase SQL editor or with the Supabase CLI:

```bash
supabase db push
```

Migration path:

```text
supabase/migrations/0001_real_deal_schema.sql
supabase/migrations/0002_workspace_state.sql
```

## Lovable Setup Steps

1. Create or open the Lovable Real Deal project.
2. Connect Supabase from Lovable Integrations.
3. Create a new Supabase project dedicated to Real Deal.
4. Run `supabase/migrations/0001_real_deal_schema.sql`.
5. Add these environment variables to Lovable:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

6. Ask Lovable to wire the app to Supabase without changing the product behavior.
7. Keep deterministic mock data as a fallback for demo mode until real authentication and seed data are confirmed.
8. Test imports, Gmail history, campaigns, daily recommendations, saved dashboards, and reports against Supabase data.

## Tables Included

- `founders`: founder workspace and operating focus.
- `relationship_pods`: grouping layer for relationship map categories.
- `people`: relationship records and scoring inputs.
- `campaigns`: active founder initiatives.
- `campaign_targets`: why a person matters to a campaign.
- `campaign_actions`: concrete next actions tied to campaigns.
- `interactions`: timeline entries, including Gmail-derived email events.
- `import_batches`: structured records of contact uploads and parsing results.
- `email_sync_runs`: Gmail sync audit trail.
- `saved_dashboard_snapshots`: durable dashboard history.
- `workspace_state`: single-workspace persistence used by the current Vercel app while the deeper row-by-row Supabase model is wired in.

## Deferred Work

The migration prepares persistence, but these implementation steps should happen only after a Supabase project exists:

- Replace localStorage manual campaign persistence with Supabase writes.
- Store imported people and campaign relationships in Supabase.
- Store Gmail sync results as `interactions` rows.
- Split `workspace_state` JSON persistence into normalized table writes once multi-user authentication is ready.
- Add authenticated workspace routing.
- Add seed and backup scripts.
- Add integration tests that run against a disposable Supabase test database.
