# Only Paws - Technical Stack Documentation

## Overview

Complete technical specification for the Only Paws dog-friendly locations web application.

## Project Summary

A web application that helps dog owners find and share dog-friendly locations including restaurants, parks, stores, and more.

**Key Features:**

- Interactive map with custom markers
- User-generated location tagging
- Reviews and ratings
- Photo uploads
- Favorites system
- User profiles

---

## Frontend Stack

### Framework

- **Nuxt 3** (latest version)
- **Vue 3** with Composition API
- **TypeScript 5+** (strict mode)

### Styling

- **Tailwind CSS** (v3+)
- **Nuxt UI** (optional component library)
- Custom responsive design

### State Management

- **Pinia** (Vue state management)
- Stores for auth, locations, map, user

### Build Tools

- **Vite** (included with Nuxt 3)
- **PostCSS** (for Tailwind)

---

## Backend Stack

### Server Framework

- **Nuxt Server API** (server-side routes)
- **Node.js** 18+
- **TypeScript**

### API Design

- RESTful API endpoints
- JSON request/response
- CORS enabled

---

## Database

### Primary Database

- **PostgreSQL 15+**
- **Prisma ORM** (type-safe database client)
- **Docker Compose** for local development

### Geospatial Extension

- **PostGIS** extension (PostgreSQL)
- Geospatial queries and indexing
- Location-based radius searches

### Connection String

```
postgresql://username:password@host:5432/database
```

---

## Authentication

### Provider

- **Clerk** (clerk.dev)
- OAuth support (Google, GitHub, etc.)
- Email/password authentication
- Session management

### Clerk Nuxt Module

- `@clerk/nuxt`
- JWT token validation
- Protected routes middleware

### Integration Points

- Sign up / Sign in pages
- Protected API routes
- User session management
- Profile synchronization

---

## Third-Party Services

### Google Maps API

**Required APIs:**

- Maps JavaScript API v3
- Places API (address autocomplete)

**Features:**

- Interactive map display
- Custom marker styling
- Geocoding (address → coordinates)
- Reverse geocoding (coordinates → address)

**Free Tier:**

- $200/month credit
- ~28,000 map loads/month (sufficient for development/production)

**API Key Configuration:**

- Environment variable: `GOOGLE_MAPS_API_KEY`
- Enable APIs in Google Cloud Console
- Configure billing account

---

### Cloudinary

**Purpose:**

- Image upload and storage
- Image transformations (thumbnails, resizing, optimization)
- CDN delivery

**Features:**

- Client-side upload widget
- Responsive image delivery
- Automatic optimization
- Format conversion (WebP)

**Free Tier:**

- 25GB storage
- 25GB bandwidth/month
- 25,000 transformations/month

**Configuration:**

- Environment variables:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

**Image Transformations:**

- Thumbnail: `w_300,h_300,c_fill`
- Gallery: `w_800,h_600,c_fill`
- Large: `w_1200,h_900,c_fill`

---

## DevOps & Deployment

### Local Development

#### Docker Services

```yaml
Services:
  - db: PostgreSQL + PostGIS
  - app: Nuxt 3 application
```

#### Docker Compose

- **PostgreSQL Container:**
  - Image: `postgis/postgis:15-3.3-alpine`
  - Port: 5432
  - Volumes: Persistent data storage
  - Health checks enabled

- **Nuxt App Container:**
  - Build: `Dockerfile.dev`
  - Port: 3000
  - Hot-reload enabled
  - Depends on database

#### Environment Variables Management

- `.env` file (gitignored)
- `.env.example` for reference

---

### Production Deployment

#### Application Hosting: Vercel

**Benefits:**

- Automatic deployments from git
- Zero configuration needed
- Built-in analytics
- Global CDN
- Serverless functions

**Configuration:**

- Connect GitHub repository
- Set build command: `npm run build`
- Set output directory: `.output`
- Configure environment variables

**Pricing:**

- Hobby Tier: Free (sufficient for initial launch)
- Pro Tier: $20/month (more bandwidth, functions)

#### Database Hosting: Render

**Benefits:**

- Managed PostgreSQL
- Automatic backups
- Easy scaling
- Free tier available

**Pricing:**

- Free: 90 days, 256MB RAM
- $7/month: 1GB RAM, 10GB storage

**Configuration:**

- PostgreSQL + PostGIS template
- Environment variables for connection string

---

## CI/CD Pipeline

### GitHub Actions

**Workflow: `.github/workflows/ci.yml`**

**Stages:**

1. **Lint**
   - Run ESLint
   - Run Prettier check
   - Fail on errors

2. **Type Check**
   - Run TypeScript compiler
   - Strict mode enabled
   - Fail on type errors

3. **Unit Tests**
   - Run Vitest
   - Generate coverage report
   - Fail if coverage below 80%

4. **E2E Tests**
   - Run Playwright
   - Headless mode
   - Test critical user flows

5. **Build**
   - Run `npm run build`
   - Verify build artifacts
   - Fail on build errors

6. **Deploy** (main branch only)
   - Deploy to Vercel
   - Trigger production build
   - Notify deployment status

**Triggers:**

- Pull requests to any branch
- Push to main branch

**Branch Protection Rules:**

- Require pull request before merging
- Require approval (1 reviewer)
- Require status checks to pass:
  - Lint
  - Type Check
  - Unit Tests
  - E2E Tests
  - Build

---

## Development Tools

### Code Quality

- **ESLint** (JavaScript/TypeScript/Vue linter)
- **Prettier** (Code formatter)
- **Husky** (Git hooks)

### Version Control

- **Git** (version control)
- **Conventional Commits** (commit message format)

### Database Tools

- **Prisma Studio** (database admin UI)
- **Prisma CLI** (migrations, seeding)

### Testing

- **Vitest** (unit testing)
- **Playwright** (E2E testing)
- **@vue/test-utils** (Vue component testing)

### Docker

- **Docker Compose** (orchestration)
- **Docker CLI** (container management)

---

## Code Quality Standards

### TypeScript

- Strict mode enabled
- All files typed
- No `any` types (use `unknown` instead)
- Explicit return types

### Vue Components

- Composition API preferred
- Props typed with TypeScript interfaces
- Emits typed
- `<script setup lang="ts">`

### Code Style

- ESLint rules from Nuxt
- Prettier formatting
- Max 100 characters per line
- 2 spaces indentation

### Testing Coverage

- Minimum 80% coverage
- Test critical paths first
- Test error scenarios

### Git Workflow

- Feature branches: `feature/feature-name`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`
- Pull request required for main
- Squash merge to main

---

## Security

### Authentication & Authorization

- Clerk JWT validation on API routes
- Protected routes via middleware
- Role-based access (future: admin role)

### API Security

- CORS configuration
- Rate limiting (future)
- Input validation
- SQL injection prevention (Prisma)

### Secrets Management

- Environment variables never committed
- `.env` in `.gitignore`
- CI/CD secrets in GitHub repository settings
- Production secrets in Vercel/Render dashboards

### Data Protection

- Email addresses not exposed publicly
- User profiles optional information
- Secure file uploads (Cloudinary)

---

## Performance

### Caching

- API response caching (future: Redis)
- Cloudinary CDN for images
- Google Maps cache

### Optimization

- Lazy loading for images
- Lazy loading for locations (incremental fetch)
- Map marker clustering (reduce render count)
- Virtual scrolling for long lists
- Debounced search inputs
- Memoized computations (Vue computed)

### Bundle Size

- Code splitting (automatic in Nuxt)
- Route-based chunking
- Lazy loaded components
- Tree-shaking enabled

---

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSy_xxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

### Optional Variables

```env
# Application
NUXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Google Maps
GOOGLE_MAPS_DEFAULT_LAT=40.7128
GOOGLE_MAPS_DEFAULT_LNG=-74.0060
GOOGLE_MAPS_DEFAULT_ZOOM=13

# Cloudinary
CLOUDINARY_UPLOAD_PRESET=default
```

---

## Docker Configuration

### Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  db:
    image: postgis/postgis:15-3.3-alpine
    container_name: only-paws-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: onlypaws
      POSTGRES_PASSWORD: onlypaws_dev
      POSTGRES_DB: onlypaws_development
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U onlypaws']
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: only-paws-app
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://onlypaws:onlypaws_dev@db:5432/onlypaws_development
      CLERK_PUBLISHABLE_KEY: ${CLERK_PUBLISHABLE_KEY}
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
      GOOGLE_MAPS_API_KEY: ${GOOGLE_MAPS_API_KEY}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
      NODE_ENV: development
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    command: npm run dev -- --host 0.0.0.0

volumes:
  postgres_data:
  node_modules:
```

### Development Dockerfile (`Dockerfile.dev`)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Production Dockerfile (`Dockerfile.prod`)

```dockerfile
FROM node:18-alpine as base

# Install dependencies only when needed
FROM base as deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base as runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

---

## CI/CD Workflow Details

### GitHub Actions Workflow

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:e2e

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  deploy:
    needs: [lint, typecheck, test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Cost Analysis

### Development Costs

- **PostgreSQL**: $0 (Docker)
- **Clerk**: $0 (free tier)
- **Google Maps**: $0 ($200/month free credit)
- **Cloudinary**: $0 (25GB free)
- **Vercel**: $0 (hobby tier)
- **Total**: $0/month

### Production Estimates

- **Vercel (Hobby)**: $0/month
  - 100GB bandwidth
  - Unlimited deployments

- **Render PostgreSQL**: $7/month or $0 free (90 days)
  - 1GB RAM
  - 10GB storage

- **Cloudinary**: ~$20-50/month (with growth)
  - Based on usage
  - Can optimize with transformations

- **Google Maps**: $0-100/month (with growth)
  - Based on map loads
  - Can optimize with caching

- **Total**: $7-157/month

### Scaling Considerations

- Vercel Pro: $20/month (after bandwidth limit)
- Render PostgreSQL: Scale vertically (more RAM/Storage)
- Cloudinary: Scale with usage-based pricing
- Google Maps: Scale with traffic

---

## Backup & Recovery

### Database Backups

- **Render**: Automated daily backups (7-day retention)
- **PostgreSQL**: Manual export to SQL dumps
- **Future**: Automated backups to S3

### Code Backups

- **Git**: Complete version history
- **GitHub**: Remote repository backup
- **Vercel**: Deployment snapshots

### Disaster Recovery

- **Restoration**: Database restore from backup
- **Rollback**: Git revert or Vercel rollback
- **Redundancy**: Cloudinary CDN for images

---

## Monitoring & Analytics

### Production Monitoring

- **Vercel Analytics** (built-in)
  - Page views
  - Web vitals
  - User demographics

- **Console Logs**
  - Error logging
  - Application logs

### Future Enhancements

- **Sentry**: Error tracking and alerting
- **Prometheus + Grafana**: Metrics and visualization
- **LogRocket**: User session replay

---

## Performance Targets

### Web Vitals

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### API Response Times

- Simple queries: < 100ms
- Geospatial queries: < 200ms
- Complex queries: < 500ms

### Page Load Times

- First paint: < 1s
- Full load: < 3s

---

## Dependencies Overview

### Core Dependencies

```json
{
  "nuxt": "^3.10.0",
  "vue": "^3.4.0",
  "@vueuse/core": "^10.7.0",
  "@pinia/nuxt": "^0.5.1",
  "pinia": "^2.1.7"
}
```

### Database

```json
{
  "@prisma/client": "^5.9.0",
  "prisma": "^5.9.0"
}
```

### Authentication

```json
{
  "@clerk/nuxt": "^0.3.7"
}
```

### Maps

```json
{
  "@googlemaps/js-api-loader": "^1.16.0"
}
```

### Cloudinary

```json
{
  "cloudinary": "^2.0.0",
  "@cloudinary/vue-3": "^1.0.0"
}
```

### Styling

```json
{
  "@nuxtjs/tailwindcss": "^6.10.0",
  "@nuxtjs/color-mode": "^3.3.2"
}
```

### Development

```json
{
  "@types/node": "^20.11.0",
  "typescript": "^5.3.3",
  "eslint": "^8.56.0",
  "prettier": "^3.2.0",
  "vitest": "^1.2.0",
  "@vue/test-utils": "^2.4.3"
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌──────────────┐  ┌────────────────────────────────┐  │
│  │  Nuxt 3 App  │  │  Clerk JS SDK (Auth)           │  │
│  │  (Vue 3)     │◄─┤  Google Maps API              │  │
│  │  Pinia Store │  │  Cloudinary Upload Widget     │  │
│  └──────────────┘  └────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ HTTPS / API Calls
                             │
┌────────────────────────────┴────────────────────────────┐
│                    Nuxt Server API                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Server Routes (/api/*)                         │  │
│  │  ├── locations/                                 │  │
│  │  ├── reviews/                                   │  │
│  │  ├── photos/                                    │  │
│  │  ├── comments/                                  │  │
│  │  └── favorites/                                 │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                     │
│  ┌──────────────┴───────────────────────────────────┐  │
│  │  Business Logic                                 │  │
│  │  - Prisma ORM (Database operations)             │  │
│  │  - Clerk JWT validation                         │  │
│  │  - Cloudinary integration                       │  │
│  │  - Geospatial queries (PostGIS)                 │  │
│  └──────────────┬───────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────────┘
                  │
                  │ SQL Connection
                  │
┌─────────────────┴──────────────────────────────────────┐
│              PostgreSQL + PostGIS (Docker)             │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Tables:                                        │  │
│  │  - users                                        │  │
│  │  - locations (with geospatial data)             │  │
│  │  - reviews                                      │  │
│  │  - photos                                       │  │
│  │  - comments                                     │  │
│  │  - favorites                                    │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              CI/CD Pipeline (GitHub Actions)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Lint &      │  │  Unit & E2E  │  │  Build &     │  │
│  │  Typecheck   │──►│  Tests       │──►│  Deploy      │  │
│  │  (ESLint,    │  │  (Vitest,    │  │  (Vercel)    │  │
│  │   Prettier,  │  │   Playwright)│  │              │  │
│  │   TSC)       │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Future Enhancements

### Potential Features

- [ ] Real-time updates (WebSocket)
- [ ] Push notifications
- [ ] Social sharing
- [ ] Admin dashboard
- [ ] Advanced search filters
- [ ] Location-specific dog amenities
- [ ] Pet services directory (groomers, vets)
- [ ] Event calendar (dog-friendly events)
- [ ] Community forums

### Technical Improvements

- [ ] Redis caching layer
- [ ] GraphQL API
- [ ] Server-side rendering optimization
- [ ] Microservices architecture
- [ ] Mobile app (React Native)
- [ ] Advanced analytics (custom dashboards)

---

## Documentation References

- [Nuxt 3 Documentation](https://nuxt.com/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Google Maps API](https://developers.google.com/maps)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [Vercel Documentation](https://vercel.com/docs)

---

## Support & Maintenance

### Team Roles

- **Frontend Developer**: Vue.js/Nuxt development
- **Backend Developer**: API/Database development
- **DevOps Engineer**: CI/CD, infrastructure
- **QA Engineer**: Testing and quality assurance

### Maintenance Schedule

- Weekly dependency updates
- Monthly security patches
- Quarterly performance reviews
- Annual architecture review

---

**Version:** 1.0.0
**Last Updated:** 2025-01-25
**Status:** Ready for Implementation
