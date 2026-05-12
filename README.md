# Real Deal

Real Deal is a relationship operating system for highly connected founders. It helps a founder decide who matters most, who needs attention today, why a relationship matters, and which active campaigns depend on the relationship graph.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- lucide-react
- Local structured mock data
- Deterministic AI mock services
- Dashboard report output as PDF, email, and HTML
- Vitest and Testing Library

## Commands

```bash
npm ci
npm run dev
npm run verify
npm run lint
npm run test
npm run build
npm run verify:ui
```

Open [http://localhost:3000](http://localhost:3000) after starting the development server.

`npm run verify` runs lint, tests, and production build. `npm run verify:ui` runs the browser-based product verification script against a running local server.

## Structure

- `src/app`: App Router pages, route handlers, loading state, and error state.
- `src/components`: Product UI for the dashboard, relationship map, people, campaigns, and shared controls.
- `src/lib/data`: Mock people, pods, campaigns, and domain types.
- `src/lib/scoring`: Social Equity Score model.
- `src/lib/recommendations`: Daily recommendation engine.
- `src/ai`: Prompt templates, client boundary, deterministic mock behavior, and AI-style services.
- `src/server`: Server-side data services used by pages and API routes.
- `src/server/reports`: Report composition, PDF generation, and email delivery boundary.
- `src/server/integrations/gmail`: Gmail read-only sync boundary for relationship email history.
- `tests`: Scoring, recommendation, API, and UI behavior tests.
- `docs`: Architecture notes.
- `config`: Product configuration.
- `.github/workflows`: GitHub Actions quality checks.

## AI Behavior

The app does not require an AI API key. AI-facing services use deterministic mock responses so demos, tests, and builds are stable. The client boundary in `src/ai/clients` is ready for a real provider integration later.

## Product Notes

The first screen is the usable founder dashboard. The relationship map, person detail panel, campaigns workspace, and contact search are all connected through local state and shared server-provided data. The search bar finds relationships by name, company, role, tag, pod, or email and opens the selected person's detail panel.

The Report page includes the Output section, where the founder chooses how to export the dashboard report:

- Download as a PDF from `/api/report/pdf`
- Email as a PDF through `/api/report/email`
- Open as HTML at `/report`

The header includes a visible Report button that opens `/report`, plus a Save dashboard button. Saved dashboard snapshots are stored locally in the browser and include all tracked people so the founder can review prior dashboard history during the prototype.

The Campaigns workspace includes a manual campaign creation section. Founders can define the campaign, search existing contacts, add target people, and delete campaigns that should no longer appear in the active relationship system. Manual campaigns are stored locally for the prototype and participate in relationship relevance, person detail, recommendations, and the manual contact workflow.

The Upload contacts button opens an import panel for founder relationship data. A dropdown lets the founder choose file upload, public Google import, or manual contact entry. The file path is optimized for 1,000+ row CSV and Excel files, and also supports Word, PowerPoint, PDF, JSON, and text uploads, plus public Google Sheets, Docs, Slides, and Drive links. The manual form captures the same relationship fields and runs through the same normalization pipeline. Its campaign field is linked to the current active campaign list, so newly created campaigns appear as options and deleted campaigns are removed. The importer normalizes relationship fields, merges duplicates by email or name plus company, flags rows needing review, classifies contacts into pods, detects campaign relevance, and assigns initial Social Equity Scores for review.

Imported contacts are not just previews. The dashboard converts every ready imported record into an active relationship, attaches it to detected or newly created campaigns, recomputes relationship insights, and includes those contacts in the Daily Focus Queue, Relationship Map, Person Detail panel, Campaigns workspace, saved dashboard history, and recommendation engine. Private Google files need a future OAuth connection.

The Sync Gmail button reads relationship email history through `/api/integrations/gmail/sync`. This uses the free Gmail API with the read-only scope `https://www.googleapis.com/auth/gmail.readonly`; it does not depend on the Codex Gmail connector. Gmail account identity is authorized through Google at runtime and is not stored in source code.

For local setup:

1. Create a free Google Cloud project.
2. Enable the Gmail API.
3. Create an OAuth client for a web application.
4. Add this authorized redirect URI: `http://localhost:3000/api/integrations/gmail/callback`.
5. Copy `.env.example` to `.env.local`.
6. Add `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` to `.env.local`.
7. Restart the dev server, open Real Deal, click `Sync Gmail`, then click `Connect Gmail`.

After Google authorization, Real Deal stores the refresh token in `config/private/gmail-oauth-token.json`, which is ignored by git. `GMAIL_REFRESH_TOKEN` is still supported for manual or hosted setups. Without OAuth credentials, the app runs deterministic demo sync data so the relationship history workflow remains testable. See `config/gmail.example.env` for the supported environment names.

Synced Gmail activity appears inside each person's detail panel in a dedicated Email history section. Sent and received messages show direction, subject, date, and the synced snippet so the relationship record stays attached to the correct contact.

## GitHub Readiness

The repository is prepared for GitHub with CI, an environment template, contribution guidance, and security guidance. Before uploading, review `docs/github-readiness.md`, run `npm run verify`, and confirm that `.env.local`, `config/private`, `.verification`, `.next`, and `node_modules` are not included.
