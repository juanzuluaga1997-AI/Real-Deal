# Security

## Secrets

Never commit private credentials, OAuth tokens, mailbox addresses, production data, or local browser verification profiles.

Protected local files include:

- `.env.local`
- `config/private/gmail-oauth-token.json`
- `.verification`
- `.next`
- `node_modules`

The Gmail integration uses `https://www.googleapis.com/auth/gmail.readonly` and stores local OAuth tokens in `config/private`, which is ignored by git. Use `.env.example` or `config/gmail.example.env` as templates only.

## Before Publishing

Before pushing to GitHub, run:

```bash
npm run verify
git status --ignored
git add --dry-run .
```

Confirm that no real `.env` files, Gmail secrets, OAuth tokens, verification browser profiles, or generated build artifacts appear in the add list.
