# Real Deal Architecture

Real Deal is structured as a Next.js App Router application with a clear split between product UI, domain logic, server services, API routes, and AI-facing services.

## Main Layers

- `src/app`: App Router entry points, route handlers, loading state, and error state.
- `src/components`: Dashboard, relationship map, people, campaign, and shared UI components.
- `src/lib/data`: Local structured mock data and shared domain types.
- `src/lib/scoring`: Isolated Social Equity Score model.
- `src/lib/recommendations`: Deterministic daily recommendation engine.
- `src/ai`: Prompt templates, AI client interface, deterministic mock client, and relationship insight services.
- `src/server`: Server-side people, campaign, and recommendation services used by pages and API routes.
- `src/server/reports`: Dashboard report composition, PDF generation, and deterministic email delivery.
- `tests`: Unit, API, and UI behavior tests.
- `config`: Product-level configuration for demo settings.
- `supabase`: Optional Lovable handoff migrations for durable production persistence.

## AI Layer

The AI layer is intentionally isolated. The app works without an API key by using `DeterministicAiClient`, which returns stable mock insight text. Prompt templates live in `src/ai/prompts/templates.ts` and cover daily recommendations, score explanations, relationship history summaries, suggested next actions, and contact import classification.

## Scoring

The Social Equity Score is computed from relationship importance, recency, interaction frequency, responsiveness, active campaign relevance, history strength, and decay resistance. The model is in `src/lib/scoring/social-equity-score.ts` and is covered by focused tests.

## Recommendations

The daily recommendation engine ranks people by overdue commitments, active campaign relevance, high relationship importance, declining momentum, recent opportunities, and follow-up commitments. It returns three to five recommendations with a reason and suggested action.

## Reports And Output

The dashboard Report button opens `/report`. The report page owns the Output section so the founder reviews the report first, then chooses whether to download a PDF, open the HTML report in another window, or email the PDF. All formats use one report service so they contain the same information. The PDF endpoint streams a generated PDF from `src/server/reports/pdf.ts`, and the email endpoint prepares a deterministic local delivery result that can be replaced by a real email provider later.

Saved dashboard history is client-side for the prototype. `FounderWorkspace` stores dashboard snapshots in `localStorage`, including the selected relationship context, campaign context, health metrics, and every tracked person with score and decay risk.

## Imports

Contact imports are handled by `src/app/api/imports/contacts/route.ts`, `src/server/imports`, and pure normalization logic in `src/lib/import`. The import panel has a method dropdown for file upload, public Google import, and manual contact entry. The import service reads Excel, CSV, Word, PowerPoint, PDF, JSON, and text uploads, then converts tabular rows or document text into structured contact records. Manual contacts are posted to the same route and processed by the same normalization layer. That layer handles large spreadsheet imports by normalizing dates and text fields, detecting missing identity data, merging duplicates by email or name plus company, classifying contacts into pods, detecting campaign relevance, assigning initial Social Equity Scores, and returning an import summary for review. Public Google Sheets, Docs, Slides, and Drive file URLs are converted to export URLs and parsed through the same service.

The dashboard uses `src/lib/import/relationship-import-adapter.ts` to turn import results into active relationship state. Imported records become `PersonInsight` objects, detected campaign names become active campaign records when they do not already exist, campaign target lists are merged, and the Daily Focus Queue is recomputed against the combined base and imported relationship graph. This keeps 1,000+ imported contacts visible in the map, person detail panel, campaigns workspace, saved dashboard snapshots, and recommendation engine instead of leaving them as a static preview. Private Google files require OAuth later.

Gmail sync is isolated under `src/server/integrations/gmail`, `src/app/api/integrations/gmail`, and `src/lib/email`. The app uses a first-party Google OAuth flow through `/api/integrations/gmail/connect` and `/api/integrations/gmail/callback`, requests the read-only Gmail scope, and stores the refresh token in a git-ignored private local file by default. Environment-based refresh tokens are still supported for manual or hosted deployments. The server never stores a mailbox address in source code. The sync service normalizes message metadata into `ContactEmailEvent` records, and the client enrichment layer adds those events to each matching relationship timeline, notes, recency, interaction frequency, responsiveness, history strength, score, and daily recommendations. When OAuth credentials are missing, deterministic demo Gmail events are returned so the product flow remains usable and testable without personal data.

## Lovable And Supabase Handoff

The current app does not require Supabase to run. The Lovable handoff adds `docs/lovable-transition.md`, `docs/prompts/lovable-master-prompt.md`, `docs/supabase-transition-plan.md`, and `supabase/migrations/0001_real_deal_schema.sql` so a future Lovable build can add durable storage without weakening the existing prototype. Supabase should become the persistence layer for authenticated founder workspaces, imported relationships, campaign state, Gmail-derived interactions, and saved dashboard snapshots once a dedicated Supabase project exists.

The first production persistence bridge uses `/api/workspace-state`, `src/server/supabase`, and `supabase/migrations/0002_workspace_state.sql`. It stores the current single-workspace state as JSON in Supabase while preserving browser local storage as an offline fallback. This keeps the Vercel app stable now and gives Lovable a clean path to normalize those writes into the table model later.
