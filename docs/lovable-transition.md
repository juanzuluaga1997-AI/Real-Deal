# Lovable Transition Guide

This guide prepares Real Deal for a careful handoff into Lovable while keeping the existing GitHub and Vercel app safe.

## Source Of Truth

- Product name: Real Deal
- Local folder: `C:\Users\user\Desktop\Real Deal`
- GitHub repository: `https://github.com/juanzuluaga1997-AI/Real-Deal`
- Production deployment: `https://real-deal-xi.vercel.app`
- Protected separate product: AIssistant. Do not rename, delete, overwrite, or reuse any AIssistant repository or Vercel project.

## Current App Shape

Real Deal is a Next.js App Router application for highly connected founders. It helps a founder understand the relationship graph, decide who needs attention today, track campaign relevance, import large contact files, and preserve relationship evidence such as Gmail history.

The app is intentionally organized by ownership:

- `src/app`: routes, pages, API handlers, loading, and error states.
- `src/components`: dashboard, relationship map, people, campaigns, reports, and shared UI.
- `src/lib`: domain logic for scoring, recommendations, imports, email enrichment, campaigns, and mock data.
- `src/server`: server-side services for people, campaigns, recommendations, reports, imports, and Gmail.
- `src/ai`: prompt templates, deterministic AI client, and relationship insight services.
- `tests`: unit, API, import, scoring, recommendation, and UI tests.
- `config`: app-level configuration and environment examples.
- `supabase`: migration files for the Lovable/Supabase handoff.

## Non-Negotiables

- Every user-facing string, source code identifier, comment, prompt, document, and test must stay in English.
- The app is Real Deal, not a generic CRM.
- The first screen must be the usable founder workspace, not a landing page.
- The Daily Focus Queue is the backbone of the product and must refresh from the current date every day.
- Relationship scoring must remain explainable.
- Imported contacts must become active relationships, not static previews.
- The app must support 1,000+ contacts through structured import and deduplication.
- Gmail evidence must attach to the correct person by email and appear in that person's Email history.
- Campaigns must connect objectives, target people, next actions, due dates, health, and relationship relevance.
- The Trolley-inspired visual system must stay coherent and restrained.
- AIssistant must remain untouched.

## Lovable Limitation To Plan Around

Lovable's GitHub integration is strongest when Lovable creates or syncs its own repository. Its documentation currently says existing external GitHub repositories cannot be imported directly as a new Lovable project. Because Real Deal already has a working repository, the safest transition is:

1. Keep `juanzuluaga1997-AI/Real-Deal` as the canonical source of truth.
2. Create a separate Lovable project for Real Deal.
3. Paste the master prompt from `docs/prompts/lovable-master-prompt.md`.
4. Use the GitHub repository and this handoff guide as reference material.
5. If Lovable creates a new repository, treat it as a migration branch/repo, not as the canonical app until it is reviewed.
6. Compare any Lovable-generated code against the current Real Deal repo before replacing production.

## Recommended Lovable Workflow

1. Open Lovable and create a new project named `Real Deal`.
2. Paste the master prompt from `docs/prompts/lovable-master-prompt.md`.
3. Connect Supabase only after confirming the schema in `supabase/migrations/0001_real_deal_schema.sql`.
4. Ask Lovable to preserve the current product behavior first, then improve only after the parity check passes.
5. If Lovable asks to connect GitHub, use the same GitHub account but do not overwrite the current Real Deal repository.
6. If Lovable creates a new repo, name it clearly, such as `Real-Deal-Lovable`, and keep `Real-Deal` untouched until review.
7. Run a manual QA pass against the Lovable build using the checklist below.
8. Only merge or replace the current production app after the Lovable version passes the checklist.

## Supabase Position

Supabase is recommended for the Lovable transition because the current prototype stores manual campaigns, imported relationships, saved dashboard snapshots, and Gmail-enriched relationship state locally or in deterministic app data. A production Lovable version needs durable storage.

This repo includes a first migration at `supabase/migrations/0001_real_deal_schema.sql`. It covers:

- Founder profile ownership.
- Relationship pods.
- People and relationship scoring inputs.
- Campaigns, campaign target relevance, and next actions.
- Interaction history, including Gmail-derived email events.
- Contact import batches.
- Gmail sync runs.
- Saved dashboard snapshots.

The current runtime is not forced to depend on Supabase yet. That keeps the existing local, GitHub, and Vercel app stable until a Supabase project URL and keys are available.

## Required Environment Variables For A Supabase Build

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Keep service-role keys server-side only. Never expose them in client components, screenshots, Loom videos, or GitHub.

## QA Checklist Before Accepting A Lovable Version

- The app opens directly to the Real Deal workspace.
- All visible text is English.
- Daily Focus Queue changes when the current app date changes.
- Clicking a person updates Person Detail instantly.
- Relationship Map selection and Person Detail selection stay in sync.
- All Contacts opens in a separate searchable window.
- Upload contacts can parse CSV and Excel files and can handle large contact lists.
- Imported contacts appear in Daily Focus Queue, Relationship Map, Person Detail, Campaigns, saved dashboard history, and recommendations.
- Campaigns show objective, status, stage, target people, next actions, due date, health, and relationship relevance.
- Gmail sync can connect through OAuth and attach sent/received email history to the correct contact.
- Report, Save dashboard, Sync Gmail, All contacts, and Upload contacts buttons do not regress.
- Supabase policies prevent unrelated users from reading each other's relationship data.
- The UI remains coherent with the current Trolley-inspired design system.
- The current GitHub repo and Vercel project for AIssistant are not touched.

