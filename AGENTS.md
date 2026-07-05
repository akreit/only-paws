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
npm run lint:fix
npm run typecheck
npm run format:check

npm run test:unit
npx vitest run
npm run test:unit:coverage
npm run test:e2e
npm run test:e2e:ui

npm run prisma:generate
npm run prisma:migrate
npx prisma db push
npm run prisma:seed
```

## Repo shape

- Frontend lives in `src/app` (`pages`, `components`, `composables`, `stores`, `middleware`, `types`, `plugins`, `assets`); `nuxt.config.ts` sets `srcDir: 'src/app'`.
- Server lives in `src/server` (`api`, `utils`); `nuxt.config.ts` sets `serverDir: 'src/server'`.
- Tests live in `tests/unit` and `tests/e2e`; shared test helpers are in `tests/helpers`, and factories live in `tests/fixtures`.
- State uses Pinia; composables wrap store access and API calls.
- Common frontend flow is component → composable → Pinia store → `/api/*`, with notifications dispatched through `useNotificationsStore()`.
- Domain types live in `src/app/types/` and are re-exported from `src/app/types/index.ts`.
- Google Maps and Cloudinary integrations are wrapped in composables like `src/app/composables/useMap.ts` and `src/app/composables/usePhotos.ts`.

## Server rules

- Nitro route pattern: `[resource]/index.get.ts`, `index.post.ts`, `[id].get.ts`, `[id].delete.ts`.
- Handlers use `defineEventHandler(...)`, Nitro helpers like `readBody(event)` / route params / query helpers, and throw `createError({ statusCode, message })` for API errors.
- In server files, use Nitro auto-imports from `src/server/utils/` for utilities like `prisma` and `requireAuth(event)`.
- Do **not** use `~/` aliases in server code.
- Prisma is configured via `src/server/utils/prisma.ts` with `@prisma/adapter-pg`.
- `prisma/schema.prisma` has no datasource `url`; use `prisma.config.ts`.

## Auth

- Clerk handles auth.
- Use `requireAuth(event)` for protected server routes.
- Users are synced into the local `User` table via `POST /api/users/sync`.
- On the client, `useAuthSync()` keeps Clerk state aligned with `useAuthStore()` / `useUserStore()`, and `src/app/middleware/auth.ts` protects signed-in pages.

## Testing expectations

- Add/update unit tests for logic changes.
- Vitest uses `tests/setup.ts` for shared mocks/env setup and enforces 80% coverage thresholds.
- Server route tests live under `tests/unit/server/api/**` and use `tests/helpers/server.ts` to stub Nitro globals.
- Add/update Playwright coverage for meaningful UI flow changes.
- `npm run test:e2e` runs the Playwright projects from `playwright.config.ts` (desktop + mobile browsers); set `BASE_URL` when pointing at an existing app.
- Before finishing, ensure tests pass and there are no relevant lint/type errors.
