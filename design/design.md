# Only Paws — Design

A web app for discovering and sharing dog-friendly locations (parks, restaurants, stores, etc.).

---

## High-Level Architecture

```
Browser
  └── Nuxt 4 (Vue 3 + TypeScript + Tailwind)
        ├── Pinia stores (auth, locations, map, user, notifications)
        └── Composables → Nuxt Server API (/api/*)
                              ├── Prisma ORM → PostgreSQL + PostGIS (Docker)
                              ├── Clerk JWT validation
                              └── Cloudinary (image upload/storage)

External SDKs loaded client-side:
  - Clerk JS (auth UI + session tokens)
  - Google Maps JS API (map, markers, Places autocomplete)
  - Cloudinary upload widget
```

**Key directories** (see `nuxt.config.ts` for non-standard paths):

```
src/app/          # Frontend (srcDir)
  pages/          # File-based routes
  components/     # Vue components
  composables/    # useLocations, useMap, useAuth, useFavorites, usePhotos, useReviews
  stores/         # Pinia stores
  types/          # TypeScript type definitions
src/server/       # Nitro server (serverDir, relative to rootDir)
  api/            # Route handlers
  utils/
    prisma.ts     # PrismaClient singleton (Nitro auto-import)
    auth.ts       # requireAuth() — returns clerkUserId or throws 401
```

---

## Module View

### Pages

| Route                  | Auth     | Purpose                                           |
| ---------------------- | -------- | ------------------------------------------------- |
| `/`                    | —        | Landing: hero, featured locations, CTA            |
| `/map`                 | —        | Interactive map with filters and location markers |
| `/locations/[id]`      | —        | Location details, reviews, photos                 |
| `/profile`             | required | User profile, contributions, favorites            |
| `/sign-in`, `/sign-up` | —        | Clerk auth pages                                  |

### Server API

All routes follow Nitro file naming: `[resource]/index.get.ts`, `[resource]/[id].delete.ts`, etc.

| Resource    | Endpoints                                        | Auth                     |
| ----------- | ------------------------------------------------ | ------------------------ |
| `locations` | GET (list+filter), POST, GET /[id], DELETE /[id] | POST/DELETE require auth |
| `reviews`   | POST, DELETE /[id]                               | required                 |
| `photos`    | POST, DELETE /[id]                               | required                 |
| `comments`  | POST, DELETE /[id]                               | required                 |
| `favorites` | GET, POST, DELETE /[locationId]                  | required                 |
| `users`     | POST /sync                                       | required                 |

`GET /api/locations` supports query params: `type`, `lat`, `lng`, `radius`, `search`, `limit`, `offset`.

### Database Models

```
User          id, clerkUserId, email?, username?, bio?, avatarUrl?
Location      id, name, type (enum), description?, address, lat, lng,
              website?, phone?, hours?, leashRequired?, breedRestrictions?,
              offLeashArea?, amenities?, createdById → User
Review        id, rating (1-5), comment?, locationId → Location, authorId → User
Photo         id, url, caption?, publicId (Cloudinary), locationId, uploaderId
Comment       id, text, photoId → Photo, authorId → User
Favorite      id, userId → User, locationId → Location
```

Relationships: User 1:N {Location, Review, Photo, Comment, Favorite}; Location 1:N {Review, Photo, Favorite}; Photo 1:N Comment.

PostGIS enables radius/geospatial queries on location coordinates.

### Frontend Modules

**Composables** wrap store + API calls and are the primary interface for components:

| Composable     | Responsibility                         |
| -------------- | -------------------------------------- |
| `useAuth`      | Clerk session, sign-in/out, user sync  |
| `useMap`       | Google Maps init, markers, geolocation |
| `useLocations` | Location CRUD, filters                 |
| `usePhotos`    | Photo upload (→ Cloudinary) + delete   |
| `useReviews`   | Review create/delete, average rating   |
| `useFavorites` | Add/remove/check favorites             |

**Component groups:**

- `map/` — MapView (Google Maps container), LocationMarker (type-colored), MapControls (filters + search)
- `location/` — LocationCard, AddLocationForm, ReviewCard, PhotoGallery, FavoriteButton
- `ui/` — Button, Input, Modal, Rating, Select, Toast, LoadingSpinner
- `layout/` — AppHeader (logo, search, auth), AppFooter

**Auth flow:** Clerk handles UI; server routes call `requireAuth(event)` which validates the Bearer JWT and returns `clerkUserId`. Users are synced to the DB via `POST /api/users/sync` on first sign-in.

---

## Testing

- **Unit** (`npm run test:unit`) — Vitest, covers composables, components, server utils. Run a single file: `npm run test:unit -- tests/unit/composables/useLocations.spec.ts`
- **E2E** (`npm run test:e2e`) — Playwright, covers landing, map, auth, navigation. Headed: `--headed`, UI mode: `npm run test:e2e:ui`
- **Coverage** — `npm run test:unit:coverage`

---

## Running Locally

```bash
# 1. Start the database (required first)
docker-compose up -d

# 2. Install dependencies and set up DB
npm install
npm run prisma:generate
npm run prisma:migrate   # or: prisma db push
npm run prisma:seed      # optional sample data

# 3. Configure environment — copy .env.example to .env and fill in:
#    DATABASE_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
#    GOOGLE_MAPS_API_KEY, CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET

# 4. Start dev server
npm run dev              # http://localhost:3000

# Code quality
npm run lint:fix
npm run typecheck
npm run format
```

---

## Deployment

**Target:** Vercel (app) + Render managed PostgreSQL (with PostGIS template).

CI/CD via GitHub Actions (`.github/workflows/ci.yml`): lint → typecheck → unit tests → e2e tests → build → deploy to Vercel (main branch only).

**Required env vars in production:**
`DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `GOOGLE_MAPS_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

Before deploying: run `npm run prisma:migrate` against the production DB.
