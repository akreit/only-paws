# AGENTS.md

Canonical repo guidance for both GitHub Copilot and Claude Code.

## Working style

- Plan before editing; inspect the existing flow first.
- Keep changes small, clear, and aligned with current patterns.
- Prefer feature-oriented organization and concise comments only where helpful.
- Validate every non-trivial change with targeted tests and/or type checks.

## Commands

```bash
npm run dev
docker compose up -d

npm run lint
npm run typecheck

npx vitest run
npm run test:e2e

npm run prisma:generate
npx prisma db push
```

## Repo shape

- Frontend lives in `src/app` (`pages`, `components`, `composables`, `stores`, `middleware`).
- Server lives in `src/server` (`api`, `utils`).
- Tests live in `tests/unit` and `tests/e2e`.
- State uses Pinia; composables wrap store access and API calls.

## Server rules

- Nitro route pattern: `[resource]/index.get.ts`, `index.post.ts`, `[id].get.ts`, `[id].delete.ts`.
- In server files, use Nitro auto-imports from `src/server/utils/`.
- Do **not** use `~/` aliases in server code.
- `prisma/schema.prisma` has no datasource `url`; use `prisma.config.ts`.

## Auth

- Clerk handles auth.
- Use `requireAuth(event)` for protected server routes.
- Users are synced into the local `User` table via `POST /api/users/sync`.

## Testing expectations

- Add/update unit tests for logic changes.
- Add/update Playwright coverage for meaningful UI flow changes.
- Before finishing, ensure tests pass and there are no relevant lint/type errors.
