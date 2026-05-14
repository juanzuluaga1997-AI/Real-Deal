# Lovable Master Prompt For Real Deal

Paste this prompt into a new Lovable project when migrating or recreating Real Deal.

```text
Build an app named Real Deal.

Mandatory language rule:
Absolutely everything must be in English. This includes all user-facing text, code, comments, variable names, file names, test names, prompts, seed data, documentation, errors, empty states, and configuration labels. The users are in the United States and only speak English. The developers reviewing the code also work in English.

Current source of truth:
- GitHub: https://github.com/juanzuluaga1997-AI/Real-Deal
- Production reference: https://real-deal-xi.vercel.app
- Product handoff docs: docs/lovable-transition.md
- Supabase schema: supabase/migrations/0001_real_deal_schema.sql
- Supabase workspace persistence bridge: supabase/migrations/0002_workspace_state.sql

Important GitHub safety rule:
There is a separate app named AIssistant in the same GitHub/Vercel ecosystem. Do not delete, rename, overwrite, or reuse anything from AIssistant. Real Deal must have its own project, repository, database, and deployment path.

Product definition:
Real Deal is a relationship operating system for highly connected founders. It is not a generic CRM. It helps a founder know who matters today, why that person matters, what campaign depends on them, what changed recently, and what exact action should happen next.

Primary user:
A founder whose introductions and relationships are valuable. She does not need thousands of generic contacts in a CRM view. She needs a focused operating layer for fewer than roughly 1,000 high-value relationships, while still being able to import and manage 1,000+ contacts when needed.

Core product behavior:
1. Show the actual founder dashboard as the first screen. Do not build a marketing landing page.
2. Maintain a Daily Focus Queue that refreshes every day based on the current date.
3. Select three to five priority contacts each day using relationship urgency, overdue commitments, campaign relevance, relationship importance, momentum, recent opportunities, follow-up dates, and score risk.
4. Keep Relationship Map, Daily Focus Queue, Person Detail, Campaigns, saved dashboard history, and recommendations connected to the same relationship graph.
5. Make person selection instant. Clicking a contact in the queue or map must immediately update Person Detail and the selected state.
6. Provide an All Contacts button in the header that opens a separate searchable contact window with every stored contact.
7. Support contact imports from CSV and Excel first, with the existing app also supporting Word, PowerPoint, PDF, JSON, text, and public Google document links.
8. Imported contacts must be normalized, deduplicated by email or name plus company, classified into relationship pods, scored, and turned into active relationships.
9. Imported contacts must participate in the Daily Focus Queue, Relationship Map, Person Detail, Campaigns, saved history, and recommendations.
10. Gmail sync must attach sent and received email evidence to the matching contact's Email history by email address.
11. The app must never hardcode a personal Gmail address in source code.
12. Campaigns must include objective, status, stage, target people, next actions, due date, health, and relationship relevance.
13. Reports, saved dashboard snapshots, import flow, campaign management, Gmail sync, relationship scoring, and recommendation logic must remain functional.

Recommended architecture:
- Use a clear Next.js App Router style structure or a Lovable-equivalent structure with the same ownership boundaries.
- Keep frontend components separate from backend/API handlers.
- Keep AI logic separate from deterministic domain logic.
- Keep prompt templates in their own folder.
- Keep tests in their own folder.
- Keep configuration in its own folder.
- Keep Supabase schema and migrations in a `supabase` folder.

Suggested repo structure:
- src/app or app: routes, pages, API endpoints, loading, and errors.
- src/components: UI components grouped by dashboard, map, people, campaigns, reports, and shared controls.
- src/lib: scoring, recommendations, imports, email matching, campaign logic, date utilities, and domain types.
- src/server: server-side services and integration boundaries.
- src/ai: prompts, AI client boundary, deterministic fallback behavior, and insight services.
- tests: unit, API, import, recommendation, scoring, and UI tests.
- config: app configuration and environment examples.
- supabase: database migrations and seed guidance.
- docs: architecture, Lovable transition guide, and handoff notes.

Supabase requirement:
Use Supabase for production persistence if this Lovable project needs durable data. Start from the schema in `supabase/migrations/0001_real_deal_schema.sql`. The schema must store founder profiles, relationship pods, people, campaign target relevance, campaign actions, interactions, Gmail-derived email events, import batches, sync runs, and saved dashboard snapshots. Enable row-level security so each authenticated user can only access their own Real Deal workspace data.

Visual direction:
Use the existing Real Deal product as the behavioral reference and keep the current Trolley-inspired branding coherent across the app. Use a restrained dark interface with warm off-white surfaces, mint/green action accents, amber focus signals, and subtle borders. Avoid saturated gradients, decorative blobs, generic landing-page sections, and card-on-card clutter. The app should feel like a premium founder operating console.

Quality bar:
- Do not break existing workflows.
- Preserve Daily Focus Queue behavior; it is the backbone of the app.
- Keep the UI fast and responsive.
- Use stable dimensions for the relationship map, calendar, queues, and detail panels.
- Keep buttons, icons, tabs, search, forms, and modals accessible.
- Add or preserve tests for scoring, recommendations, imports, API routes, and UI selection behavior.
- Do not store secrets in code.
- Do not expose service-role keys to the browser.
- Keep the app deployable.

Parity checklist:
Before making improvements, first recreate the existing Real Deal behavior. Confirm that the app can:
- Load the founder workspace.
- Search contacts.
- Open All Contacts.
- Switch tabs between Dashboard, Map, and Campaigns.
- Click a person and update Person Detail instantly.
- Show Daily Focus Queue for today's date.
- Show Relationship Map.
- Show Relationship Calendar.
- Show Person Detail with Social Equity Score, Recommended next action, Email history, Timeline, related campaigns, notes, and tags.
- Import contacts.
- Sync Gmail when credentials are configured.
- Save dashboard history.
- Open and generate reports.
```
