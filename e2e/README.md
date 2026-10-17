# End-to-end tests

Playwright drives the real web UI: sign-up with an invite code, vault, notes, rename, wiki-link and backlink, search, a core plugin, trash and restore. Each run creates one account and deletes it at the end.

CI runs them in the `e2e` job of `.github/workflows/web-ci.yml` (production web build + API + fresh Postgres/Redis).

## Running locally

1. Dev database reachable (tunnel to the VPS dev Postgres/Redis, see `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md` §6).
2. API: `cd web/server && REGISTRATION_MODE=invite npx tsx src/index.ts` (port 4001).
3. Web: `cd web && npx next dev -p 3457`.
4. Once: `npx playwright install chromium`.
5. `npm run e2e` from the repository root.

`e2e/global-setup.ts` seeds the invite code (`web/server/scripts/e2e-invite.ts`, needs `DATABASE_URL` from `web/server/.env`). Set `E2E_KEEP_ACCOUNT=1` to keep the test account for debugging, `E2E_BASE_URL` to test another address. **Never point these tests at production.**
