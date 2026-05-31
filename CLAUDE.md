# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev                  # Start dev server (http://localhost:3000)
docker-compose up -d         # Start PostGIS database (required first)

# Code quality
npm run lint                 # ESLint
npm run lint:fix             # ESLint with auto-fix
npm run format               # Prettier
npm run typecheck            # TypeScript check

# Testing
npm run test:unit                                             # All unit tests (Vitest)
npm run test:unit -- --reporter=verbose tests/unit/composables/useLocations.spec.ts  # Single unit test
npm run test:unit:coverage                                    # Unit tests with coverage report
npm run test:e2e                                             # All e2e tests (Playwright)
npm run test:e2e tests/e2e/landing.spec.ts                   # Single e2e test
npm run test:e2e -- --headed                                 # E2E in headed mode
npm run test:e2e:ui                                          # E2E in Playwright UI mode

# Database
npm run prisma:generate      # Regenerate Prisma client after schema changes
npm run prisma:migrate       # Run migrations (dev)
npm run prisma:seed          # Seed database
npm run prisma:studio        # Open Prisma Studio GUI
```

## Architecture

### Directory Layout

Nuxt 4.3.0 with non-standard directories configured in `nuxt.config.ts`:

- `srcDir: 'src/app'` — all frontend code (Nuxt convention: pages, components, composables, stores, layouts, middleware, plugins, assets)
- `serverDir: 'src/server'` — all Nitro server code; this path is **relative to rootDir** (project root), not srcDir

```
src/
├── app/              # Frontend (srcDir)
│   ├── components/
│   ├── composables/  # useLocations, useMap, useAuth, useFavorites, usePhotos, useReviews
│   ├── layouts/
│   ├── middleware/   # auth.ts — route guard
│   ├── pages/        # index.vue, map.vue, profile.vue, sign-in.vue, sign-up.vue, locations/
│   ├── stores/       # Pinia stores
│   └── types/
└── server/           # Nitro server (serverDir)
    ├── api/          # Route handlers: locations/, reviews/, photos/, favorites/, users/, comments/
    └── utils/
        ├── prisma.ts # PrismaClient singleton (auto-imported as `prisma`)
        └── auth.ts   # requireAuth() (auto-imported)
tests/
├── unit/             # Vitest — components/, composables/, utils/, server/
├── e2e/              # Playwright — landing, map, auth, navigation specs
├── fixtures/         # Shared test data factories
└── helpers/          # Shared test helpers
```

### Server API Pattern

API routes use Nuxt's file-based naming: `[resource]/index.get.ts`, `[resource]/index.post.ts`, `[resource]/[id].get.ts`, `[resource]/[id].delete.ts`.

Nitro auto-imports from `src/server/utils/`:

- `prisma` — default export, PrismaClient singleton with PrismaPg adapter
- `requireAuth(event)` — named export, returns Clerk `userId` string or throws 401

**Do not use `~/` or `~/../` path aliases in server files** — rely on auto-imports only.

### Prisma v7

- `prisma/schema.prisma` has **no `url` in the datasource block** — connection is configured via `prisma.config.ts`
- `prisma.config.ts` defines `datasource.url` and the seed command
- PrismaClient requires the `@prisma/adapter-pg` driver adapter (see `src/server/utils/prisma.ts`)
- Schema is applied via `prisma db push` (no migration files exist by default); use `prisma migrate dev` to generate migrations

### Authentication

Clerk handles auth. The `requireAuth` server utility verifies the Bearer token from the `Authorization` header and returns the Clerk `userId`. The database `User` model stores a `clerkUserId` field linking to Clerk's user record. Users are synced via `POST /api/users/sync`.

### State Management

Pinia stores in `src/app/stores/`. Composables in `src/app/composables/` wrap store access and API calls (e.g., `useLocations`, `useMap`, `useFavorites`).
