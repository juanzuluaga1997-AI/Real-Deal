# GitHub Readiness

Use this checklist before publishing Real Deal to GitHub.

## Repository Setup

- Repository owner: `juan.zuluaga1997@gmail.com`
- Suggested repository name: `real-deal`
- Default branch: `main`
- Visibility: choose private until the Gmail flow, imported data handling, and product scope are approved for public release.

## Required Quality Checks

Run these locally before the first push:

```bash
npm ci
npm run lint
npm run test
npm run build
```

If the local server is running at `http://localhost:3000`, also run:

```bash
npm run verify:ui
```

The GitHub Actions workflow runs lint, tests, and build on every push to `main` and every pull request.

## Secret Safety

Do not upload:

- `.env.local`
- Gmail OAuth client secrets
- Gmail refresh tokens
- `config/private`
- `.verification`
- `.next`
- `node_modules`

Only upload `.env.example` and `config/gmail.example.env` as templates.

## First Push Commands

These commands are intentionally local-first. Review the dry run before adding files.

```bash
git init -b main
git add --dry-run .
git add .
git status
git commit -m "Initial Real Deal app"
git remote add origin <github-repository-url>
git push -u origin main
```

Do not run the final two commands until the GitHub repository has been created and the add list has been reviewed.
