# Contributing

Real Deal is built for English-speaking users and reviewed by English-speaking developers. Keep all product copy, code, comments, tests, documentation, commit messages, and configuration in English.

## Local Setup

1. Install Node.js 20.9 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` if you need Gmail OAuth locally.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

The app works without Gmail credentials by using deterministic demo data.

## Quality Gate

Run this before opening a pull request:

```bash
npm run verify
```

For visual regression checks against a running local server:

```bash
npm run verify:ui
```

## Project Standards

- Keep frontend, backend, AI, prompts, tests, and configuration in their existing folders.
- Keep UI changes responsive across desktop and mobile.
- Keep Gmail and other private credentials out of source control.
- Prefer small, focused changes with tests for user-facing behavior.
- Do not commit generated artifacts such as `.next`, `.verification`, `node_modules`, local OAuth tokens, or `.env.local`.
