<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from older guidance. Read the relevant guide in `node_modules/next/dist/docs/` before writing code and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Real Deal Project Rules

- Keep all code, comments, UI copy, prompts, tests, configuration, documentation, and commit messages in English.
- Keep frontend, backend, AI logic, prompts, tests, and configuration clearly separated in the existing project structure.
- Never commit `.env.local`, Gmail OAuth credentials, refresh tokens, mailbox addresses, `config/private`, `.verification`, `.next`, or `node_modules`.
- Run `npm run verify` before preparing a pull request or upload.
- Run `npm run verify:ui` when user-facing dashboard behavior changes and a local server is running.
