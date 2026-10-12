# Only Paws 🐾

A web application that helps dog owners find and share dog-friendly locations including restaurants, parks, stores, and more.

## Features

- 🗺️ **Interactive Map** - Explore dog-friendly locations on Google Maps
- ⭐ **Reviews & Ratings** - Read and write reviews for locations
- 📸 **Photo Sharing** - Upload and view photos of locations
- ❤️ **Favorites** - Save your favorite dog-friendly spots
- 🔍 **Search & Filter** - Find locations by type, name, or area
- 👤 **User Profiles** - Track your contributions and favorites
- 🔐 **Authentication** - Secure sign-in with Clerk

## Tech Stack

### Frontend

- **Nuxt 3** - Vue 3 framework with SSR
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Pinia** - State management
- **Google Maps API** - Interactive maps

### Backend

- **Nuxt Server API** - API routes
- **PostgreSQL** - Database with PostGIS
- **Prisma** - Type-safe ORM
- **Clerk** - Authentication

### Services

- **Cloudinary** - Image hosting and optimization
- **Vercel** - Hosting (production)
- **Docker** - Local development

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/onlypaws?schema=public"

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_MAPS_DEFAULT_LAT=40.7128
GOOGLE_MAPS_DEFAULT_LNG=-74.0060
GOOGLE_MAPS_DEFAULT_ZOOM=13

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_UPLOAD_PRESET=your_upload_preset
# Optional: dedicated unsigned preset for profile photos (falls back to CLOUDINARY_UPLOAD_PRESET)
CLOUDINARY_PROFILE_UPLOAD_PRESET=
```

### Cloudinary profile photo preset

Profile photos are uploaded unsigned into `only-paws/users/<userId>/`, and the server rejects any `public_id` outside that folder. Create a dedicated unsigned preset and set it as `CLOUDINARY_PROFILE_UPLOAD_PRESET`. If it is unset, the shared place-photo preset is used, and that only works if the shared preset doesn't force a folder or prefix. Recommended preset settings:

- Signing mode: **unsigned**
- No `folder`, `asset_folder` or `public_id_prefix`, so the client's `folder` param is honoured
- `use_filename`: false, `unique_filename`: true
- `allowed_formats`: `jpg,png,webp`
- Max file size: 5 MB (5242880 bytes)
- Max image dimensions, e.g. an incoming transformation `c_limit,w_2000,h_2000`
- Optional: `disallow_public_id`: true

After configuring it, do one real upload and confirm the returned `public_id` starts with `only-paws/users/<id>/`. See #57.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Database (Docker)

```bash
docker-compose up -d
```

### 3. Run Database Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. (Optional) Seed Database

```bash
npm run prisma:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript compiler check
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Create/apply a dev migration (`prisma migrate dev --name <change>`)
- `npm run prisma:migrate:deploy` - Apply committed migrations (non-interactive)
- `npm run prisma:studio` - Open Prisma Studio

## Project Structure

```
only-paws/
├── src/
│   ├── app/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Reusable logic
│   │   ├── layouts/        # Page layouts
│   │   ├── pages/          # File-based routes
│   │   ├── stores/         # Pinia stores
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── server/
│       ├── api/            # API endpoints
│       └── utils/          # Server utilities
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seed data
├── tests/                  # Test files
├── docker-compose.yml      # Docker configuration
└── nuxt.config.ts          # Nuxt configuration
```

## API Endpoints

### Locations

- `GET /api/locations` - List all locations
- `POST /api/locations` - Create a location (auth required)
- `GET /api/locations/:id` - Get location details
- `DELETE /api/locations/:id` - Delete location (auth required)

### Reviews

- `POST /api/reviews` - Create a review (auth required)
- `DELETE /api/reviews/:id` - Delete review (auth required)

### Photos

- `POST /api/photos` - Create a photo (auth required)
- `DELETE /api/photos/:id` - Delete photo (auth required)

### Favorites

- `GET /api/favorites` - Get user favorites (auth required)
- `POST /api/favorites` - Add favorite (auth required)
- `DELETE /api/favorites/:locationId` - Remove favorite (auth required)

### Users

- `POST /api/users/sync` - Sync Clerk user with database
- `GET /api/users/profile` - Get user profile (auth required)

## Deployment

### Vercel

Deployments only come from the CI workflow (`.github/workflows/ci.yml`), never from the Vercel Git integration:

- **Git deployments are off:** `vercel.json` sets `git.deploymentEnabled: false`, so pushes and PRs don't build on Vercel. Feature branches only run CI (lint, typecheck, unit tests, build). The repo stays connected to the Vercel project.
- **`main` → production:** the `deploy` job runs `vercel --prod` after `build` passes on a push to `main`. Concurrency group `deploy-production`, never cancelled midway.
- **`develop` → staging:** the `deploy-staging` job makes a Vercel **preview** deployment (never `--prod`) on a push to `develop` and aliases it to `only-paws-staging.vercel.app`. The alias isn't claimed yet; the first `develop` deploy claims it.
- **What each job needs:** both jobs need the repository **variables** `VERCEL_ORG_ID` (team) and `VERCEL_PROJECT_ID` (project), plus the **secret** `VERCEL_TOKEN`. `deploy-staging` also needs the variables `PRODUCTION_DATABASE_FINGERPRINT` and `STAGING_DATABASE_FINGERPRINT` (see the setup below). The action is pinned to a commit SHA and the Vercel CLI to an exact version.

**Staging caveats (it's a Vercel preview deployment):**

- **Database:** previews go through the Neon integration's preview branching. Each preview deployment gets a Neon branch named after its Git branch (`preview/develop` for staging, branched from production's default branch with a copy of production data at creation time). A Neon branch-limit hit fails the deploy with "Resource provisioning failed".
- **Unverified: does the build see the branch URLs?** The project-level `DATABASE_URL*` store variables target both Preview and Production, i.e. they are the production database. If Neon only injects the branch URLs after the build, the staging build sees production's URLs; the guard below then refuses and every `develop` deploy fails (safely, without migrating). Check the first `develop` deploy: its log must show `[migrate-deploy] Running prisma migrate deploy (staging)...`.
- **Migrations run on staging, behind an allowlist:** `deploy-staging` passes `--build-env MIGRATE_STAGING=1` plus both fingerprints, so `scripts/migrate-deploy.mjs` runs `prisma migrate deploy` in the staging build against `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`).
  - **Fingerprint:** a database fingerprint is 16 hex chars of SHA-256 over the normalised host (percent-decoded, lower-cased, trailing dot and IPv6 brackets removed, Neon `-pooler` stripped, port ignored) plus the Neon endpoint id (from `options=endpoint=…`, else the `*.neon.tech` host). It's not secret.
  - **Rule:** **every** URL (pooled and unpooled) must match `STAGING_DATABASE_FINGERPRINT`, and none may match `PRODUCTION_DATABASE_FINGERPRINT`. Otherwise the staging build fails and logs the fingerprints it saw.
  - **Branch recreated:** if `preview/develop` is recreated, its endpoint changes and staging fails closed until the variable is updated.
  - Other previews never migrate.
- **Auth:** Preview and Production share the same Clerk keys, which come from a Clerk **development** instance (`pk_test_…`), so `*.vercel.app` hosts such as staging work. If production moves to a live instance (`pk_live_…`), give Preview its own development keys or add the staging domain in Clerk.
- **Access:** Vercel Authentication protects previews (and production deployment URLs), so staging needs a Vercel login or a bypass.

**One-time staging setup (in this order):**

1. Push to `main` (any production deploy). In the `Deploy to Vercel` job log, copy `[migrate-deploy] Production database fingerprint: <16 hex>` into the repository variable `PRODUCTION_DATABASE_FINGERPRINT`.
2. Set the repository variable `STAGING_DATABASE_FINGERPRINT` to `pending`.
3. Create `develop` from `main` and push it. The staging build refuses to migrate (failing the deploy) and logs `seen fingerprint(s): <16 hex>`. Check that it differs from the production fingerprint. If it equals it, the build sees the production database (see "Unverified" above); stop there.
4. Set `STAGING_DATABASE_FINGERPRINT` to that value and re-run the `develop` workflow. The log should now show `Running prisma migrate deploy (staging)`.

`deploy-staging` stops before deploying if either variable is missing.

### Database (Neon)

- **Integration:** the database is Neon, connected through the Vercel Neon integration, which sets `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (and `PG*`/`POSTGRES_*`) for Preview and Production.
- **Migrations:** `npm run build` applies them on **production** Vercel builds (`VERCEL_ENV=production`, via `scripts/migrate-deploy.mjs`, using `DATABASE_URL_UNPOOLED` if set), and on the guarded `develop` staging build (see above). Other previews never migrate.

### Database migrations

- Change `prisma/schema.prisma`, then run `npm run prisma:migrate -- --name <change>` and commit the generated `prisma/migrations/*` folder.
- Don't use `prisma db push` against shared databases.
- **One-time production baseline:** the production database predates migrations. Before the first production deploy that includes `prisma/migrations`, mark the baseline as applied against the production DB (use the unpooled URL):

  ```bash
  DATABASE_URL="<production unpooled url>" npx prisma migrate resolve --applied 20261010072107_init
  ```

## Contributing

Please follow the coding guidelines in `AGENTS.md` when contributing to this project.

## License

MIT License - see LICENSE file for details
