# Only Paws - Application Layout & Architecture

## Overview

This document describes the complete architecture, directory structure, component hierarchy, and data flow for the Only Paws application.

---

## Overall Architecture

```
Only Paws
├── Frontend (Nuxt 3 + Vue 3)
│   ├── Pages (File-based routing)
│   ├── Components (Vue components)
│   ├── Layouts (Page templates)
│   ├── Stores (Pinia state management)
│   └── Composables (Reusable logic)
├── Backend (Nuxt Server API)
│   └── API Routes (RESTful endpoints)
├── Database (PostgreSQL + PostGIS)
│   └── Tables & Relationships
└── External Services
    ├── Clerk (Authentication)
    ├── Google Maps (Maps)
    └── Cloudinary (Image Storage)
```

---

## Directory Structure

```
only-paws/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline
├── design/
│   ├── tech-stack.md                # Technical specification
│   └── app-layout.md                # This file
├── docker-compose.yml                # Docker configuration
├── Dockerfile.dev                    # Development Dockerfile
├── Dockerfile.prod                   # Production Dockerfile
├── .env.example                      # Environment variables template
├── .eslintrc.js                      # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── .editorconfig                     # Editor settings
├── .gitignore                        # Git ignore rules
├── package.json                      # Dependencies & scripts
├── nuxt.config.ts                    # Nuxt configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
├── prisma/
│   ├── schema.prisma                 # Database schema
│   ├── seed.ts                       # Seed script
│   └── seed-data.json                # Sample data
├── src/
│   ├── app/
│   │   ├── pages/                    # File-based routing
│   │   │   ├── index.vue             # Landing page
│   │   │   ├── map.vue               # Main map view
│   │   │   ├── locations/
│   │   │   │   └── [id].vue          # Location details
│   │   │   ├── profile.vue           # User profile
│   │   │   ├── sign-in.vue           # Clerk sign-in
│   │   │   └── sign-up.vue           # Clerk sign-up
│   │   ├── components/               # Vue components
│   │   │   ├── map/
│   │   │   │   ├── MapView.vue       # Map container
│   │   │   │   ├── LocationMarker.vue# Custom marker
│   │   │   │   └── MapControls.vue   # Filters & search
│   │   │   ├── location/
│   │   │   │   ├── LocationCard.vue  # Location preview
│   │   │   │   ├── LocationDetails.vue# Full details
│   │   │   │   ├── LocationInfo.vue  # Basic info
│   │   │   │   ├── DogFeatures.vue   # Dog-specific info
│   │   │   │   ├── ReviewCard.vue    # Review display
│   │   │   │   ├── ReviewForm.vue    # Add review
│   │   │   │   ├── PhotoGallery.vue  # Photo grid
│   │   │   │   ├── PhotoLightbox.vue # Full-screen view
│   │   │   │   ├── PhotoUpload.vue   # Upload with preview
│   │   │   │   ├── AddLocationModal.vue# Create location
│   │   │   │   └── FavoriteButton.vue# Toggle favorite
│   │   │   ├── home/
│   │   │   │   ├── Hero.vue          # Landing hero
│   │   │   │   ├── FeaturedLocations.vue# Featured section
│   │   │   │   └── CallToAction.vue  # CTA section
│   │   │   ├── auth/
│   │   │   │   └── AuthButton.vue    # Sign in/out button
│   │   │   ├── ui/
│   │   │   │   ├── Button.vue        # Reusable button
│   │   │   │   ├── Input.vue         # Form input
│   │   │   │   ├── Modal.vue         # Modal dialog
│   │   │   │   ├── Rating.vue        # Star rating
│   │   │   │   ├── Select.vue        # Dropdown select
│   │   │   │   ├── Tabs.vue          # Tab navigation
│   │   │   │   ├── Toast.vue         # Notification toast
│   │   │   │   └── LoadingSpinner.vue# Loading indicator
│   │   │   └── layout/
│   │   │       ├── AppHeader.vue     # Site header
│   │   │       └── AppFooter.vue     # Site footer
│   │   ├── composables/              # Reusable logic
│   │   │   ├── useAuth.ts            # Clerk integration
│   │   │   ├── useMap.ts             # Google Maps integration
│   │   │   ├── useLocations.ts       # Location CRUD operations
│   │   │   ├── useCloudinary.ts      # Image upload
│   │   │   ├── usePhotos.ts          # Photo management
│   │   │   ├── useReviews.ts         # Review management
│   │   │   └── useFavorites.ts       # Favorite management
│   │   ├── stores/                   # Pinia stores
│   │   │   ├── auth.ts               # Authentication state
│   │   │   ├── locations.ts          # Location state
│   │   │   ├── map.ts                # Map state
│   │   │   ├── user.ts               # User profile state
│   │   │   └── notifications.ts       # Notification state
│   │   ├── types/                    # TypeScript types
│   │   │   ├── location.ts           # Location types
│   │   │   ├── review.ts             # Review types
│   │   │   ├── photo.ts              # Photo types
│   │   │   ├── comment.ts            # Comment types
│   │   │   ├── user.ts               # User types
│   │   │   └── index.ts              # Type exports
│   │   ├── utils/                    # Utility functions
│   │   │   ├── validation.ts         # Form validation
│   │   │   ├── formatters.ts         # Data formatters
│   │   │   ├── constants.ts          # App constants
│   │   │   ├── helpers.ts            # Helper functions
│   │   │   └── api.ts                # API helper functions
│   │   ├── middleware/               # Nuxt middleware
│   │   │   └── auth.ts               # Auth protection
│   │   ├── layouts/                  # Page layouts
│   │   │   ├── default.vue           # Default layout
│   │   │   └── minimal.vue           # Minimal layout (auth pages)
│   │   └── assets/                   # Static assets
│   │       ├── images/               # Images
│   │       └── styles/               # Custom styles
│   │           └── main.css          # Global styles
│   └── server/
│       └── api/                      # API routes
│           ├── locations/
│           │   ├── index.get.ts      # List locations
│           │   ├── index.post.ts     # Create location
│           │   ├── [id].get.ts       # Get location
│           │   └── [id].delete.ts    # Delete location
│           ├── reviews/
│           │   ├── index.post.ts     # Create review
│           │   └── [id].delete.ts    # Delete review
│           ├── photos/
│           │   ├── index.post.ts     # Upload photo
│           │   └── [id].delete.ts    # Delete photo
│           ├── comments/
│           │   ├── index.post.ts     # Create comment
│           │   └── [id].delete.ts    # Delete comment
│           └── favorites/
│               ├── index.get.ts      # Get user favorites
│               ├── index.post.ts     # Add favorite
│               └── [locationId].delete.ts# Remove favorite
├── tests/
│   ├── unit/                         # Vitest tests
│   │   ├── components/
│   │   │   ├── LocationCard.spec.ts
│   │   │   ├── MapView.spec.ts
│   │   │   ├── ReviewForm.spec.ts
│   │   │   └── Upload.spec.ts
│   │   ├── composables/
│   │   │   ├── useAuth.spec.ts
│   │   │   ├── useMap.spec.ts
│   │   │   ├── useLocations.spec.ts
│   │   │   └── useCloudinary.spec.ts
│   │   └── utils/
│   │       └── validation.spec.ts
│   ├── e2e/                          # Playwright tests
│   │   ├── auth.spec.ts
│   │   ├── map.spec.ts
│   │   ├── locations.spec.ts
│   │   ├── reviews.spec.ts
│   │   ├── photos.spec.ts
│   │   └── favorites.spec.ts
│   ├── vitest.config.ts              # Vitest configuration
│   └── playwright.config.ts          # Playwright configuration
├── scripts/
│   ├── setup-db.sh                   # Database setup
│   ├── seed-db.sh                    # Database seeding
│   └── generate-env.sh               # Environment generator
└── README.md                         # Project documentation
```

---

## Database Schema

### Models

#### User

```typescript
{
  id: string              // Primary key
  clerkUserId: string     // Clerk user ID (unique)
  email?: string
  username?: string
  bio?: string
  avatarUrl?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Location

```typescript
{
  id: string              // Primary key
  name: string            // Location name
  type: LocationType      // RESTAURANT, PARK, STORE, etc.
  description?: string
  address: string
  latitude: number
  longitude: number
  website?: string
  phone?: string
  hours?: string

  // Dog-specific fields
  leashRequired?: boolean
  breedRestrictions?: string // JSON string or text
  offLeashArea?: boolean
  amenities?: string        // JSON string: ["water", "treats", etc.]

  createdById: string       // Foreign key -> User
  createdBy: User
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Review

```typescript
{
  id: string              // Primary key
  rating: number          // 1-5 stars
  comment?: string
  locationId: string      // Foreign key -> Location
  location: Location
  authorId: string        // Foreign key -> User
  author: User
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Photo

```typescript
{
  id: string              // Primary key
  url: string             // Cloudinary URL
  caption?: string
  publicId: string        // Cloudinary public ID (for deletion)
  locationId: string      // Foreign key -> Location
  location: Location
  uploaderId: string      // Foreign key -> User
  uploader: User
  createdAt: DateTime
}
```

#### Comment

```typescript
{
  id: string // Primary key
  text: string
  photoId: string // Foreign key -> Photo
  photo: Photo
  authorId: string // Foreign key -> User
  author: User
  createdAt: DateTime
}
```

#### Favorite

```typescript
{
  id: string // Primary key
  userId: string // Foreign key -> User
  user: User
  locationId: string // Foreign key -> Location
  location: Location
  createdAt: DateTime
}
```

### Relationships

```
User 1:N Location (createdBy)
User 1:N Review (author)
User 1:N Photo (uploader)
User 1:N Comment (author)
User 1:N Favorite (user)

Location 1:N Review
Location 1:N Photo
Location 1:N Favorite (location)

Photo 1:N Comment
```

### PostGIS Integration

**Geospatial Features:**

- **Geometry column**: Store coordinates as POINT geometry
- **Spatial index**: Fast radius searches
- **Queries**: Find locations within X km of point

**Example Query:**

```typescript
// Find locations within 10km of coordinates
SELECT *
FROM locations
WHERE ST_DWithin(
  ST_MakePoint(longitude, latitude)::geography,
  ST_MakePoint(userLng, userLat)::geography,
  10000
);
```

---

## Page Routes

### `/` - Landing Page

**Purpose:** Welcome users to the application

**Components:**

- Hero section (app name, tagline, CTA button)
- Featured locations (grid of popular spots)
- Call to action (sign up prompt)

**SEO:**

- Title: "Only Paws - Discover Dog-Friendly Locations"
- Description: "Find and share dog-friendly restaurants, parks, stores, and more."

### `/map` - Main Map View

**Purpose:** Interactive map of all dog-friendly locations

**Components:**

- MapView (full-screen Google Map)
- LocationMarker (custom markers by type)
- MapControls (filters, search)
- AddLocationButton (authenticated users)

**Features:**

- Filter by location type
- Search locations
- Click markers to view details
- Add new locations (authenticated)

**SEO:**

- Title: "Map - Only Paws"
- No index (dynamic content)

### `/locations/[id]` - Location Details

**Purpose:** Full details for a specific location

**Components:**

- LocationDetails (main container)
- LocationInfo (basic info: name, address, hours)
- DogFeatures (dog-specific info)
- ReviewsSection (reviews + average rating)
- PhotoGallery (photos in grid)
- PhotoUpload (upload button)
- FavoriteButton (heart icon)

**Features:**

- View complete location information
- Read and write reviews
- View and upload photos
- Add to favorites
- Share location

\*\*

### `/profile` - User Profile

**Purpose:** User's personal profile and contributions

**Components:**

- UserProfileInfo (user details)
- MyContributions (locations added)
- MyFavorites (saved locations)
- MyActivity (recent reviews, photos)

**Features:**

- View and edit profile
- See all locations contributed
- Manage favorites
- View activity feed

**Authentication:** Required

### `/sign-in` - Sign In

**Purpose:** Authenticated user sign in

**Components:**

- Clerk SignIn component

**Features:**

- Email/password sign in
- OAuth providers (Google, GitHub)
- Magic link

### `/sign-up` - Sign Up

**Purpose:** New user registration

**Components:**

- Clerk SignUp component

**Features:**

- Email/password sign up
- OAuth providers (Google, GitHub)
- Email verification

---

## Component Hierarchy

```
app.vue
└── <NuxtLayout name="default">
    ├── AppHeader
    │   ├── Logo
    │   ├── SearchBar
    │   └── AuthButton / UserMenu
    │
    ├── <NuxtPage>
    │
    │   ├── pages/index.vue (Landing)
    │   │   ├── Hero
    │   │   ├── FeaturedLocations
    │   │   │   └── LocationCard[]
    │   │   └── CallToAction
    │   │
    │   ├── pages/map.vue (Map)
    │   │   ├── MapView
    │   │   │   └── LocationMarker[]
    │   │   ├── MapControls
    │   │   │   ├── FilterChip[]
    │   │   │   └── SearchInput
    │   │   └── AddLocationButton
    │   │
    │   ├── pages/locations/[id].vue (Location Details)
    │   │   ├── LocationDetails
    │   │   │   ├── LocationInfo
    │   │   │   ├── DogFeatures
    │   │   │   ├── FavoriteButton
    │   │   │   ├── ReviewsSection
    │   │   │   │   ├── ReviewCard[]
    │   │   │   │   └── ReviewForm
    │   │   │   ├── PhotoGallery
    │   │   │   │   ├── PhotoGrid
    │   │   │   │   │   └── PhotoCard[]
    │   │   │   │   ├── PhotoLightbox
    │   │   │   │   └── PhotoUpload
    │   │   │   └── ShareButton
    │   │   └── LoadingSpinner (async load)
    │   │
    │   └── pages/profile.vue (Profile)
    │       └── UserProfile
    │           ├── ProfileInfo
    │           ├── Tabs
    │           │   ├── ContributionsTab
    │           │   │   └── LocationCard[]
    │           │   ├── FavoritesTab
    │           │   │   └── LocationCard[]
    │           │   └── ActivityTab
    │           │       ├── ReviewCard[]
    │           │       └── PhotoCard[]
    │           └── EditProfileButton
    │
    └── AppFooter
        ├── Logo
        ├── Links
        │   ├── About
        │   ├── Privacy
        │   └── Terms
        ├── SocialLinks
        └── Copyright
```

---

## Component Specifications

### Map Components

#### MapView.vue

**Purpose:** Container for Google Maps integration

**Props:** None

**Emits:** None

**Features:**

- Initialize Google Maps
- Handle map events (click, zoom, pan)
- Manage marker instances
- Cluster markers if needed
- Zoom/pan to location on selection

**Dependencies:**

- Google Maps API (via useMap composable)
- LocationMarker components

---

#### LocationMarker.vue

**Purpose:** Custom marker for location on map

**Props:**

```typescript
{
  location: Location
  onClick: (location: Location) => void
  active: boolean
}
```

**Features:**

- Custom styled marker based on location type
- Click event to open info window
- Visual feedback for active marker
- Color coding by type:
  - RESTAURANT: Blue
  - PARK: Green
  - STORE: Orange
  - HOTEL: Purple
  - BEACH: Teal
  - CAFE: Yellow
  - BAR: Red
  - TRAINING_CENTER: Pink
  - GROOMER: Cyan
  - VETERINARIAN: Magenta
  - OTHER: Gray

---

#### MapControls.vue

**Purpose:** Filter and search controls for map

**State:**

- filters: Set<LocationType>
- searchQuery: string

**Features:**

- Filter chips for location types
- Search input with debouncing
- Clear all filters button
- Responsive design (sidebar on desktop, drawer on mobile)

**Events:**

- `@filter-change` (filters: Set<LocationType>)
- `@search-change` (query: string)

---

### Location Components

#### LocationCard.vue

**Purpose:** Preview card for a location

**Props:**

```typescript
{
  location: Location
  showDistance?: boolean
  distance?: number // in km
}
```

**Features:**

- Display location thumbnail (first photo)
- Show name, type, rating
- Show distance if provided
- Click to navigate to details
- Hover effects

---

#### LocationDetails.vue

**Purpose:** Full details view for a location

**Props:**

```typescript
{
  location: Location
  withReviews?: boolean
  withPhotos?: boolean
}
```

**Features:**

- Display all location information
- Show dog-specific features
- Average rating calculation
- Favorites toggle
- Share functionality

---

#### LocationInfo.vue

**Purpose:** Basic location information

**Props:**

```typescript
{
  location: Location
}
```

**Display:**

- Name
- Type (with icon)
- Address
- Website (link)
- Phone (link)
- Hours
- Description

---

#### DogFeatures.vue

**Purpose:** Dog-specific features and amenities

**Props:**

```typescript
{
  leashRequired?: boolean
  breedRestrictions?: string[]
  offLeashArea?: boolean
  amenities?: string[]
}
```

**Display:**

- Leash policy with icon
- Breed restrictions (if any)
- Off-leash area indicator
- Amenities with icons:
  - Water bowls
  - Treats
  - Dog menu
  - Patio/outdoor seating
  - Waste bags
  - Shaded area
  - etc.

---

#### ReviewCard.vue

**Purpose:** Display a single review

**Props:**

```typescript
{
  review: Review
  canDelete?: boolean
}
```

**Display:**

- User avatar and name
- Star rating
- Review text
- Date posted
- Delete button (if owner)

---

#### ReviewForm.vue

**Purpose:** Form to add a new review

**Props:**

```typescript
{
  locationId: string
  onSuccess?: () => void
}
```

**Fields:**

- Rating (1-5 stars)
- Comment (textarea, optional)

**Validation:**

- Rating required
- Comment max 500 characters

---

#### PhotoGallery.vue

**Purpose:** Grid display of location photos

**Props:**

```typescript
{
  photos: Photo[]
  canUpload?: boolean
  locationId: string
}
```

**Features:**

- Responsive grid layout
- Click to open lightbox
- Upload button (if authenticated)
- Scroll pagination for many photos

---

#### PhotoLightbox.vue

**Purpose:** Full-screen photo viewer

**Props:**

```typescript
{
  photos: Photo[]
  initialIndex: number
  onClose: () => void
}
```

**Features:**

- Full-screen overlay
- Navigation (prev/next)
- Zoom in/out
- Comments section
- Close button

---

#### PhotoUpload.vue

**Purpose:** Upload photo with preview

**Props:**

```typescript
{
  locationId: string
  onSuccess?: () => void
}
```

**Features:**

- File selection
- Client-side preview
- Caption input
- Upload to Cloudinary
- Progress indicator

---

#### AddLocationModal.vue

**Purpose:** Modal form to add new location

**Props:**

```typescript
{
  defaultCoordinates?: { lat: number, lng: number }
  onSuccess?: () => void
}
```

**Fields:**

- Name
- Type (dropdown)
- Description
- Address (with Google Places autocomplete)
- Website
- Phone
- Hours
- Dog features:
  - Leash required (checkbox)
  - Breed restrictions (text)
  - Off-leash area (checkbox)
  - Amenities (checkboxes)

**Validation:**

- Name, type, address required
- Address validated via Google Places API

---

#### FavoriteButton.vue

**Purpose:** Toggle favorite status

**Props:**

```typescript
{
  locationId: string
  isFavorite: boolean
  onToggle?: (isFavorite: boolean) => void
}
```

**Features:**

- Heart icon (filled if favorited)
- Click to toggle
- Animation on toggle
- Loading state

---

### Home Components

#### Hero.vue

**Purpose:** Landing page hero section

**Content:**

- App name and logo
- Tagline: "Everything you and your dog need"
- Subheading: "Discover and share dog-friendly locations near you"
- CTA button: "Explore Map"
- Secondary CTA: "Sign Up"

**Features:**

- Background image or gradient
- Centered layout
- Responsive typography
- Scroll indicator

---

#### FeaturedLocations.vue

**Purpose:** Display featured/popular locations

**Features:**

- Section heading
- Grid of LocationCard components
- "View All" link to map

---

#### CallToAction.vue

**Purpose:** Sign-up prompt section

**Content:**

- Heading: "Join our community"
- Text: "Share your favorite dog-friendly spots with others"
- CTA button: "Sign Up Now"

---

### UI Components

#### Button.vue

**Purpose:** Reusable button component

**Props:**

```typescript
{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}
```

**Slots:** Default (button text)

---

#### Input.vue

**Purpose:** Form input component

**Props:**

```typescript
{
  modelValue: any
  type?: 'text' | 'email' | 'password' | 'tel' | 'url'
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
}
```

**Features:**

- Floating label or external label
- Error state
- Accessibility attributes

---

#### Modal.vue

**Purpose:** Modal dialog component

**Props:**

```typescript
{
  open: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg'
}
```

**Slots:** Default (modal content), Header, Footer

**Features:**

- Backdrop click to close
- Escape key to close
- Focus trapping
- Animation

---

#### Rating.vue

**Purpose:** Star rating display/input

**Props:**

```typescript
{
  value: number
  readonly?: boolean
  onChange?: (rating: number) => void
}
```

**Features:**

- Star icons
- Hover effects (if not readonly)
- Half-star support (optional)

---

#### Select.vue

**Purpose:** Dropdown select component

**Props:**

```typescript
{
  modelValue: any
  options: Array<{ value: any, label: string }>
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
}
```

---

#### Toast.vue

**Purpose:** Notification toast

**Props:**

```typescript
{
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number // milliseconds
  onClose?: () => void
}
```

**Features:**

- Auto-dismiss
- Manual dismiss
- Color by type
- Animation

---

#### LoadingSpinner.vue

**Purpose:** Loading indicator

**Props:**

```typescript
{
  size?: 'sm' | 'md' | 'lg'
  color?: string
}
```

**Features:**

- Circular spinner animation
- Customizable size and color

---

### Layout Components

#### AppHeader.vue

**Purpose:** Fixed site header

**Content:**

- Logo (links to home)
- Search bar (global search)
- Auth button (sign in) OR User menu (if logged in)

**User Menu:**

- User avatar
- Dropdown menu:
  - Profile
  - My Favorites
  - Sign Out

**Responsive:**

- Desktop: Full header
- Mobile: Hamburger menu

---

#### AppFooter.vue

**Purpose:** Site footer

**Content:**

- Logo
- Links:
  - Homepage
  - About
  - Privacy Policy
  - Terms of Service
  - Contact
- Social media icons
- Copyright notice

---

## API Endpoints

### Locations API

#### GET /api/locations

List locations with optional filters

**Query Parameters:**

- `type?: string` - Filter by location type
- `lat?: number` - Latitude for radius search
- `lng?: number` - Longitude for radius search
- `radius?: number` - Radius in km (default: 10)
- `search?: string` - Search query (name/address)
- `limit?: number` - Results per page (default: 20)
- `offset?: number` - Pagination offset

**Response:**

```json
{
  "locations": [
    {
      "id": "string",
      "name": "string",
      "type": "RESTAURANT",
      "latitude": 40.7128,
      "longitude": -74.006,
      "address": "string",
      "rating": 4.5,
      "reviewCount": 10,
      "photoCount": 5,
      "distance": 1.2 // km
    }
  ],
  "total": 100,
  "hasMore": true
}
```

---

#### POST /api/locations

Create new location

**Authentication:** Required

**Request Body:**

```json
{
  "name": "string",
  "type": "RESTAURANT",
  "description": "string?",
  "address": "string",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "website": "string?",
  "phone": "string?",
  "hours": "string?",
  "leashRequired": boolean?,
  "breedRestrictions": "string?",
  "offLeashArea": boolean?,
  "amenities": "string?" // JSON array
}
```

**Response:**

```json
{
  "location": {
    "id": "string",
    "name": "string",
    "type": "RESTAURANT",
    // ... all fields
    "createdAt": "2025-01-25T00:00:00Z"
  }
}
```

---

#### GET /api/locations/[id]

Get location details

**Response:**

```json
{
  "location": {
    "id": "string",
    "name": "string",
    "type": "RESTAURANT",
    "description": "string",
    "address": "string",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "website": "string?",
    "phone": "string?",
    "hours": "string?",
    "leashRequired": boolean?,
    "breedRestrictions": "string?",
    "offLeashArea": boolean?,
    "amenities": "string?",
    "createdBy": {
      "id": "string",
      "username": "string",
      "avatarUrl": "string?"
    },
    "createdAt": "2025-01-25T00:00:00Z",
    "updatedAt": "2025-01-25T00:00:00Z"
  },
  "reviews": [
    {
      "id": "string",
      "rating": 5,
      "comment": "string?",
      "author": {
        "id": "string",
        "username": "string",
        "avatarUrl": "string?"
      },
      "createdAt": "2025-01-25T00:00:00Z"
    }
  ],
  "photos": [
    {
      "id": "string",
      "url": "string",
      "caption": "string?",
      "uploader": {
        "id": "string",
        "username": "string",
        "avatarUrl": "string?"
      },
      "commentCount": 5,
      "createdAt": "2025-01-25T00:00:00Z"
    }
  ],
  "averageRating": 4.5,
  "isFavorite": false
}
```

---

#### DELETE /api/locations/[id]

Delete location

**Authentication:** Required (owner or admin)

**Response:**

```json
{
  "success": true,
  "message": "Location deleted successfully"
}
```

---

### Reviews API

#### POST /api/reviews

Create review

**Authentication:** Required

**Request Body:**

```json
{
  "locationId": "string",
  "rating": 5,
  "comment": "string?"
}
```

**Response:**

```json
{
  "review": {
    "id": "string",
    "rating": 5,
    "comment": "string",
    "locationId": "string",
    "authorId": "string",
    "createdAt": "2025-01-25T00:00:00Z"
  }
}
```

---

#### DELETE /api/reviews/[id]

Delete review

**Authentication:** Required (owner)

**Response:**

```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

### Photos API

#### POST /api/photos

Upload photo

**Authentication:** Required

**Request:** Form data with file

```
- file: File
- locationId: string
- caption: string?
```

**Response:**

```json
{
  "photo": {
    "id": "string",
    "url": "string",
    "caption": "string?",
    "publicId": "string",
    "locationId": "string",
    "uploaderId": "string",
    "createdAt": "2025-01-25T00:00:00Z"
  }
}
```

---

#### DELETE /api/photos/[id]

Delete photo

**Authentication:** Required (owner)

**Response:**

```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

---

### Comments API

#### POST /api/comments

Create comment on photo

**Authentication:** Required

**Request Body:**

```json
{
  "photoId": "string",
  "text": "string"
}
```

**Response:**

```json
{
  "comment": {
    "id": "string",
    "text": "string",
    "photoId": "string",
    "authorId": "string",
    "createdAt": "2025-01-25T00:00:00Z"
  }
}
```

---

#### DELETE /api/comments/[id]

Delete comment

**Authentication:** Required (owner)

**Response:**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

---

### Favorites API

#### GET /api/favorites

Get user's favorites

**Authentication:** Required

**Response:**

```json
{
  "favorites": [
    {
      "location": {
        "id": "string",
        "name": "string",
        "type": "RESTAURANT",
        "latitude": 40.7128,
        "longitude": -74.006,
        "rating": 4.5,
        "reviewCount": 10,
        "photoCount": 5
      },
      "addedAt": "2025-01-25T00:00:00Z"
    }
  ]
}
```

---

#### POST /api/favorites

Add location to favorites

**Authentication:** Required

**Request Body:**

```json
{
  "locationId": "string"
}
```

**Response:**

```json
{
  "favorite": {
    "id": "string",
    "userId": "string",
    "locationId": "string",
    "createdAt": "2025-01-25T00:00:00Z"
  }
}
```

---

#### DELETE /api/favorites/[locationId]

Remove from favorites

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "message": "Removed from favorites"
}
```

---

## State Management (Pinia Stores)

### auth.ts

**State:**

```typescript
{
  user: User | null
  isAuthenticated: boolean
  clerkUserId: string | null
  loading: boolean
}
```

**Actions:**

- `init()` - Initialize from Clerk session
- `signIn()` - Redirect to sign in
- `signOut()` - Sign out
- `updateUser()` - Update user profile

**Getters:**

- `isAuthenticated` - Boolean
- `clerkUserId` - Clerk user ID

---

### locations.ts

**State:**

```typescript
{
  locations: Location[]
  currentLocation: Location | null
  filters: {
    type: LocationType | null
    radius: number
    search: string
  }
  loading: boolean
  error: string | null
}
```

**Actions:**

- `fetchNearby(lat, lng)` - Fetch locations near coordinates
- `fetchById(id)` - Fetch single location
- `create(data)` - Create new location
- `update(id, data)` - Update location
- `delete(id)` - Delete location
- `setFilters(filters)` - Update filters
- `clearFilters()` - Clear filters

**Getters:**

- `filteredLocations` - Locations with filters applied
- `currentLocation` - Currently selected location

---

### map.ts

**State:**

```typescript
{
  center: { lat: number, lng: number }
  zoom: number
  activeFilter: LocationType | null
  mapInstance: GoogleMap | null
  markers: Map<string, LocationMarker>
}
```

**Actions:**

- `setCenter(lat, lng)` - Update map center
- `setZoom(zoom)` - Update zoom level
- `setActiveFilter(type)` - Set active type filter
- `setMapInstance(instance)` - Store map instance
- `addMarker(id, marker)` - Add marker
- `removeMarker(id)` - Remove marker

---

### user.ts

**State:**

```typescript
{
  profile: User | null
  contributions: Location[]
  favorites: Favorite[]
  activity: Activity[]
  loading: boolean
}
```

**Actions:**

- `fetchProfile()` - Fetch user profile
- `updateProfile(data)` - Update profile
- `fetchContributions()` - Fetch user's locations
- `fetchFavorites()` - Fetch user's favorites
- `fetchActivity()` - Fetch user activity
- `toggleFavorite(locationId)` - Add/remove favorite

---

### notifications.ts

**State:**

```typescript
{
  toasts: Toast[]
}
```

**Actions:**

- `show(message, type)` - Show toast
- `dismiss(id)` - Dismiss toast
- `clear()` - Clear all toasts

---

## Composables

### useAuth.ts

**Purpose:** Clerk authentication integration

**Returns:**

```typescript
{
  user: Ref<User | null>
  isAuthenticated: Ref<boolean>
  clerkUserId: Ref<string | null>
  signIn: () => void
  signOut: () => void
  init: () => Promise<void>
}
```

---

### useMap.ts

**Purpose:** Google Maps loader and management

**Returns:**

```typescript
{
  loader: Loader
  map: Ref<google.maps.Map | null>
  initMap: (element: HTMLElement) => Promise<void>
  createMarker: (location: Location) => google.maps.Marker
  clearMarkers: () => void
}
```

---

### useLocations.ts

**Purpose:** Location CRUD operations

**Returns:**

```typescript
{
  fetchNearby: (params: FetchParams) => Promise<Location[]>
  fetchById: (id: string) => Promise<Location>
  create: (data: CreateLocationData) => Promise<Location>
  update: (id: string, data: UpdateLocationData) => Promise<Location>
  delete: (id: string) => Promise<void>
  loading: Ref<boolean>
  error: Ref<string | null>
}
```

---

### useCloudinary.ts

**Purpose:** Cloudinary image upload

**Returns:**

```typescript
{
  upload: (file: File, options?: UploadOptions) => Promise<UploadResult>
  delete: (publicId: string) => Promise<void>
  getTransformedUrl: (url: string, transformation: Transformation) => string
}
```

---

### usePhotos.ts

**Purpose:** Photo management operations

**Returns:**

```typescript
{
  fetchByLocation: (locationId: string) => Promise<Photo[]>
  upload: (file: File, locationId: string, caption?: string) => Promise<Photo>
  delete: (id: string) => Promise<void>
}
```

---

### useReviews.ts

**Purpose:** Review management operations

**Returns:**

```typescript
{
  fetchByLocation: (locationId: string) => Promise<Review[]>
  create: (data: CreateReviewData) => Promise<Review>
  delete: (id: string) => Promise<void>
  getAverageRating: (locationId: string) => Promise<number>
}
```

---

### useFavorites.ts

**Purpose:** Favorites management operations

**Returns:**

```typescript
{
  fetchUserFavorites: () => Promise<Favorite[]>
  add: (locationId: string) => Promise<Favorite>
  remove: (locationId: string) => Promise<void>
  isFavorite: (locationId: string) => Promise<boolean>
}
```

---

## Authentication Flow

### Sign Up Flow

1. User visits `/sign-up`
2. Clerk SignUp component renders
3. User fills out form (email/password or OAuth)
4. Clerk creates account and session
5. Clerk hooks trigger user creation in our database
6. User record created with `clerkUserId`
7. User redirected to `/` or `/map`

### Sign In Flow

1. User visits `/sign-in`
2. Clerk SignIn component renders
3. User authenticates (email/password or OAuth)
4. Clerk creates session
5. If user record doesn't exist, create it
6. User redirected to `/` or `/map`

### Sign Out Flow

1. User clicks sign out in user menu
2. Clerk terminates session
3. User state cleared in app
4. User redirected to `/`

### Protected Route Flow

1. User navigates to protected route (e.g., `/profile`)
2. Navigation guard (middleware) checks authentication
3. If not authenticated, redirect to `/sign-in?redirectUrl=/profile`
4. If authenticated, allow access

---

## User Journey Flows

### Add Location Flow

1. **Navigate to Map** (`/map`)
   - User visits map page
   - Map initialized with user's location

2. **Click "Add Location"**
   - Button only shown if authenticated
   - If not authenticated, redirect to sign in

3. **Open AddLocationModal**
   - Modal opens with form
   - Map shows click-to-drop-pin option

4. **Fill Out Form**
   - Name: Required
   - Type: Required (dropdown)
   - Description: Optional
   - Address: Required (with Google Places autocomplete)
   - Coordinates: Auto-filled from address or map click
   - Website: Optional
   - Phone: Optional
   - Hours: Optional
   - Dog Features: Optional

5. **Submit Form**
   - Validate all required fields
   - POST `/api/locations`
   - Server validates and creates location

6. **Success**
   - Location created in database
   - Marker appears on map
   - Modal closes
   - Toast notification: "Location added successfully!"

---

### Write Review Flow

1. **View Location Details**
   - User navigates to `/locations/[id]`
   - Location details loaded

2. **Click "Write Review"**
   - Check if authenticated
   - If not, redirect to sign in with return URL

3. **ReviewForm Renders**
   - Star rating (1-5): Required
   - Comment (textarea): Optional, max 500 chars

4. **Submit Review**
   - Validate rating is selected
   - POST `/api/reviews`
   - Server validates and creates review

5. **Success**
   - Review added to database
   - Location average rating updated
   - Review appears in reviews list
   - Toast notification: "Review posted!"

---

### Upload Photo Flow

1. **View Location Details**
   - User on `/locations/[id]`
   - Photo gallery visible

2. **Click "Upload Photo"**
   - Check authentication
   - If not authenticated, redirect to sign in

3. **PhotoUpload Component**
   - File input: Select image from device
   - Preview shows selected image
   - Caption input: Optional

4. **Client-Side Preview**
   - FileReader reads file
   - Preview displayed to user

5. **Submit Upload**
   - Upload file to Cloudinary
   - Get back: URL, public_id
   - POST `/api/photos` with metadata

6. **Success**
   - Photo record created in database
   - Photo appears in gallery
   - Toast notification: "Photo uploaded!"

---

### Add Favorite Flow

1. **View Location**
   - User on `/locations/[id]` or viewing card

2. **Click Heart Icon**
   - Component checks favorite status (GET `/api/favorites` check)
   - If not favorited:
     - POST `/api/favorites`
     - Icon fills (animated)
     - Toast: "Added to favorites"
   - If already favorited:
     - DELETE `/api/favorites/[locationId]`
     - Icon clears (animated)
     - Toast: "Removed from favorites"

3. **State Updates**
   - Favorites store updated
   - Profile favorites updated
   - Button state reflects current status

---

## Layout Structure

### Header (Fixed)

**Desktop (> 1024px):**

```
[Logo]              [Search Bar]      [Sign In] / [Avatar ▼]
```

**Mobile (< 1024px):**

```
[Logo]                          [≡]
```

- Hamburger menu opens drawer with:
  - Search
  - Sign In / Profile
  - Link: Home
  - Link: Map
  - Link: Profile (if authenticated)

---

### Main Content (Scrollable)

**Default Layout:**

```
┌─────────────────────────────────┐
│ AppHeader (fixed)               │
├─────────────────────────────────┤
│                                 │
│  Page Content                   │
│  (varies by route)              │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ AppFooter                       │
└─────────────────────────────────┘
```

**Map Page Layout (Full-screen map):**

```
┌─────────────────────────────────┐
│ AppHeader (fixed)               │
├─────────────────────────────────┤
│                                 │
│  MapView (full viewport)        │
│  + MapControls (floating)       │
│                                 │
└─────────────────────────────────┘
```

---

### Footer

**Content:**

```
┌─────────────────────────────────┐
│  Only Paws     Links    Social  │
│                Home     Twitter │
│                About    FB      │
│                Privacy  Insta   │
│                Terms            │
│                         © 2025  │
└─────────────────────────────────┘
```

---

## Responsive Design

### Mobile (< 768px)

**Header:**

- Logo (small)
- Hamburger menu
- Drawer for navigation

**Map:**

- Full-screen map
- Controls in drawer or bottom sheet
- Add location button FAB (floating action button)

**Location Cards:**

- Stacked vertically
- Full-width images
- Compact text

**Forms:**

- Full-width inputs
- Single column
- Stacked buttons

**Modals:**

- Full-screen on mobile
- Bottom sheet for some modals

---

### Tablet (768px - 1024px)

**Header:**

- Logo + Search + Auth (inline)
- Collapsible menu

**Map:**

- Map with sidebar overlay
- Controls in sidebar

**Location Cards:**

- 2-column grid
- Medium-sized images

**Forms:**

- 2-column layout where appropriate
- Side-by-side buttons

**Modals:**

- Centered modal (medium size)

---

### Desktop (> 1024px)

**Header:**

- Full navigation inline

**Map:**

- Split view: Map (70%) + Sidebar (30%)
- Location cards in sidebar
- Controls on sidebar

**Location Cards:**

- 3-4 column grid (on landing)
- Card with hover effects

**Forms:**

- Grid layout
- Multi-column inputs

**Modals:**

- Large centered modal

---

## Error Handling

### Client-Side Errors

### Form Validation

- Client-side validation before submission
- Visual errors on invalid fields
- Helper text below inputs

### API Errors

- Fetch error handling with try-catch
- Display error toasts
- Retry buttons on transient errors

### Loading States

- Loading spinners on async operations
- Skeleton screens for lists
- Disabled buttons during requests

### 404 Not Found

- Custom 404 page
- Link to home or map
- Friendly message

### 500 Server Error

- Generic error page
- Link to home
- Contact support info

---

### Server-Side Errors

### Validation Errors

```json
{
  "error": "Validation failed",
  "details": {
    "name": "Name is required",
    "rating": "Rating must be between 1 and 5"
  }
}
```

### Authentication Errors

```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to perform this action"
}
```

### Not Found Errors

```json
{
  "error": "Not Found",
  "message": "Location not found"
}
```

### Server Errors

```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong. Please try again later."
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

**Priority Components:**

- LocationCard
- ReviewForm
- PhotoUpload
- Button, Input, Modal (UI components)

**Priority Composables:**

- useAuth
- useLocations
- useCloudinary
- Formatters, validators

**Coverage Targets:**

- Lines: 80%+
- Functions: 80%+
- Branches: 75%+
- Statements: 80%+

---

### E2E Tests (Playwright)

**Critical Flows:**

1. **Authentication Flow**
   - Sign up with email
   - Sign in
   - Sign out
   - Protected redirect

2. **Map Interactions**
   - Load map
   - Filter by type
   - Search locations
   - Click marker
   - View location details

3. **Location CRUD**
   - Add location
   - View location details
   - Update location
   - Delete location

4. **Reviews Flow**
   - Write review
   - View review
   - Delete review
   - Rating calculation

5. **Photos Flow**
   - Upload photo
   - View photo gallery
   - Delete photo

6. **Favorites Flow**
   - Add favorite
   - View favorites in profile
   - Remove favorite

**Test Environment:**

- Headless mode in CI
- Headed mode for local debugging
- Test data seeded before tests
- Cleanup after tests

---

## Performance Considerations

### Lazy Loading

### Component Lazy Loading

```typescript
const PhotoLightbox = defineAsyncComponent(() => import('~/components/location/PhotoLightbox.vue'))
```

### Route Lazy Loading

- Nuxt handles this automatically

### Image Lazy Loading

- `loading="lazy"` on img tags
- Intersection Observer API for gallery

---

### Code Splitting

- Automatic in Nuxt 3
- Route-based chunks
- Dynamic imports for heavy components

---

### Data Fetching

### Incremental Fetch

- Fetch locations in batches (20 at a time)
- "Load More" button or infinite scroll

### Debouncing

- Search input: 300ms debounce
- Filter changes: No debounce (immediate)
- Autocomplete: 500ms debounce

---

### Caching

### API Response Caching

- Cache location list (5 minutes)
- Cache location details (10 minutes)
- Invalidate cache on updates

### Map Cache

- Google Maps cache markers
- Prevent re-rendering unchanged data

### Cloudinary CDN

- All images served from CDN
- Browser caching headers

---

### Optimizations

### Map Marker Clustering

- Cluster markers when zoomed out
- Use `@googlemaps/markerclustererplus`

### Virtual Scrolling

- For long lists (favorite list, activity feed)
- Use `<RecycleScroller>` from Vue Virtual Scroller

### Memoization

- Vue computed properties for expensive calculations
- Pinia getters for derived state

### Image Optimization

- Cloudinary transformations for thumbnails
- WebP format when supported
- Responsive images with `srcset`

---

## Accessibility

### Keyboard Navigation

- All interactive elements keyboard accessible
- Visible focus indicators
- Skip to content link

### ARIA Labels

- Semantic HTML elements
- `aria-label` on buttons without text
- `aria-describedby` for form errors
- `alt` text on all images

### Screen Reader Support

- Semantic structure (heading hierarchy)
- Live regions for dynamic content (toasts)
- Descriptive link text

### Focus Management

- Modal focus trapping
- Restore focus after modal close
- Auto-focus first input in forms

### Color Contrast

- WCAG AA compliance (4.5:1 ratio)
- Don't rely on color alone
- Icon + text labels

---

## Security Considerations

### API Security

- **JWT Validation:** Clerk tokens validated on all protected routes
- **Rate Limiting:** Future implementation (Redis-based)
- **Input Validation:** Server-side validation on all inputs
- **SQL Injection:** Prevented by Prisma ORM
- **CORS:** Configured to allow only trusted origins

### Data Privacy

- **Email Addresses:** Never exposed publicly
- **User Data:** Optional profile fields
- **Secure Uploads:** Only allowed image types to Cloudinary
- **No PII:** Avoid storing personally identifiable information

### Secrets Management

- **Environment Variables:** Never committed to Git
- **.gitignore:** `.env` file ignored
- **CI/CD Secrets:** Stored in GitHub repository settings
- **Production Secrets:** Stored in Vercel/Render dashboards

---

## Monitoring & Analytics

### Vercel Analytics (Built-in)

- Page views
- Web vitals (LCP, FID, CLS)
- User demographics
- Browser/device breakdown

### Console Logging

- Error logging to console
- API request/response logging (development only)
- Performance timing logs

### Future Enhancements

- **Sentry:** Error tracking and alerting
- **PostHog:** Product analytics
- **LogRocket:** Session replay for debugging
- **Prometheus + Grafana:** Metrics visualization

---

## Internationalization (Future)

### Multi-Language Support

- English (first)
- Spanish, French, German (planned)

### Localization

- Date/time formats
- Number formatting
- Currency support (if needed)
- Currency: USD (if fees introduced)

### Implementation

- `@nuxtjs/i18n` module
- Separate JSON files for translations
- Language switcher component
- Persistent language preference

---

## Analytics & Tracking

### Page Views

- All page navigation tracked
- Route changes tracked

### User Actions

- Sign up / sign out
- Add location
- Write review
- Upload photo
- Add/remove favorite
- Filter usage

### Map Interactions

- Marker clicks
- Filter changes
- Search queries
- Location type clicks

### Feature Usage

- Photos uploaded per user
- Reviews written per user
- Locations contributed per user
- Favorite count trends

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit + E2E)
- [ ] No linting errors
- [ ] No type errors
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Production database backup created

### Deployment Steps

- [ ] Run `npm run build`
- [ ] Deploy to Vercel
- [ ] Verify build success
- [ ] Test production site
- [ ] Check monitoring/analytics

### Post-Deployment

- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify key user flows work
- [ ] Notify team of deployment

---

## Future Features

### Potential Enhancements

- [ ] Real-time updates (WebSocket)
- [ ] Push notifications for new locations
- [ ] Social sharing (share to FB, Twitter, etc.)
- [ ] Admin dashboard (moderation, analytics)
- [ ] Advanced search filters (amenities, rating range)
- [ ] Location-specific amenities (dog menu, water station)
- [ ] Pet services directory (groomers, vets, trainers)
- [ ] Event calendar (dog meetups, events)
- [ ] Community forums/discussions
- [ ] Mobile apps (iOS/Android)

### Technical Improvements

- [ ] Redis caching layer
- [ ] GraphQL API
- [ ] Server-side rendering optimization
- [ ] Microservices architecture
- [ ] GraphQL subscriptions for real-time
- [ ] Image recognition for auto-tagging
- [ ] ML for location recommendations

---

## Documentation References

- [Nuxt 3 Documentation](https://nuxt.com/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Google Maps API](https://developers.google.com/maps)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)

---

**Version:** 1.0.0
**Last Updated:** 2025-01-25
**Status:** Ready for Implementation
