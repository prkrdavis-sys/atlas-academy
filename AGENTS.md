<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Cloud agents use `.cursor/environment.json`. Builds run `npm ci` from the lockfile. A Next.js 16.2.10 dev server starts on port 3000 in the shared `dev` terminal.

Verify UI work against http://localhost:3000. Country data and generated assets already live in the repo — do not run `npm run refresh-data` unless the task is specifically about regenerating data.

Useful checks:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run verify-integrity`

Add these as Cursor Cloud secrets (never commit them): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `FRIEND_INVITE_SECRET`.
