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
- `npm run prisma:migrate` - Run database migrations
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

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Database (Render)

1. Create PostgreSQL database on Render
2. Update `DATABASE_URL` in Vercel
3. Run migrations: `npm run prisma:migrate:deploy`

## Contributing

Please follow the coding guidelines in `AGENTS.md` when contributing to this project.

## License

MIT License - see LICENSE file for details
