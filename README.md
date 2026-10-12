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
```

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
- **What each job needs:** both jobs need the repository **variables** `VERCEL_ORG_ID` (team) and `VERCEL_PROJECT_ID` (project), plus the **secret** `VERCEL_TOKEN`. The action is pinned to a commit SHA and the Vercel CLI to an exact version.

**Staging caveats (it's a Vercel preview deployment):**

- **Database:** previews use the Neon integration's preview branching, not the production database. Each preview deployment gets a Neon branch named after its Git branch (`preview/develop` for staging, branched from production's default branch with a copy of production data at creation time). It's injected as `DATABASE_URL`/`DATABASE_URL_UNPOOLED` at deploy time only. A Neon branch-limit hit fails the deploy with "Resource provisioning failed".
- **Migrations don't run on staging:** `scripts/migrate-deploy.mjs` only migrates when `VERCEL_ENV=production`. Schema changes on `develop` aren't applied to `preview/develop` automatically; apply them by hand or reset the branch.
- **Auth:** Preview and Production share the same Clerk keys, which come from a Clerk **development** instance (`pk_test_…`), so `*.vercel.app` hosts such as staging work. If production moves to a live instance (`pk_live_…`), give Preview its own development keys or add the staging domain in Clerk.
- **Access:** Vercel Authentication protects previews (and production deployment URLs), so staging needs a Vercel login or a bypass.

### Database (Render)

1. Create PostgreSQL database on Render
2. Update `DATABASE_URL` in Vercel
3. Migrations are applied automatically by `npm run build` on **production** Vercel builds only (`VERCEL_ENV=production`, via `scripts/migrate-deploy.mjs`, using `DATABASE_URL_UNPOOLED` if set). Preview/staging builds do not migrate (they run on Neon preview branches; see the caveats above).

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
