# Quick Start Guide - Only Paws 🐾

This guide will help you get the Only Paws application running on your local machine in just a few minutes.

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Docker Desktop installed and running
- [ ] Clerk account created (https://clerk.dev)
- [ ] Google Cloud account with Maps API enabled
- [ ] Cloudinary account created (https://cloudinary.com)

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Navigate to the project
cd /home/andreas/dev/only-paws

# Install dependencies
npm install
```

### 2. Set Up External Services

#### Clerk (Authentication)

1. Go to https://clerk.dev and create an account
2. Create a new application
3. Copy the **Publishable Key** and **Secret Key**
4. In Clerk Dashboard, go to "Paths" and set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/`
   - After sign-up URL: `/`

#### Google Maps API

1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create API credentials (API Key)
5. Restrict the key to your domain (optional but recommended)

#### Cloudinary (Image Upload)

1. Go to https://cloudinary.com and create account
2. Copy **Cloud Name**, **API Key**, and **API Secret**
3. Create an upload preset:
   - Go to Settings > Upload
   - Scroll to "Upload presets"
   - Add upload preset
   - Set signing mode to "Unsigned"
   - Copy the preset name

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Database (default for Docker)
DATABASE_URL="postgresql://postgres:password@localhost:5432/onlypaws?schema=public"

# Clerk (from Clerk dashboard)
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Google Maps (from Google Cloud Console)
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXX
GOOGLE_MAPS_DEFAULT_LAT=40.7128
GOOGLE_MAPS_DEFAULT_LNG=-74.0060
GOOGLE_MAPS_DEFAULT_ZOOM=13

# Cloudinary (from Cloudinary dashboard)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxx
CLOUDINARY_UPLOAD_PRESET=your_preset_name
```

### 4. Start the Database

```bash
# Start PostgreSQL with PostGIS in Docker
docker-compose up -d

# Wait a few seconds for the database to initialize
# You can check if it's ready with:
docker-compose ps
```

### 5. Initialize the Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate

# (Optional) Seed with sample data
npm run prisma:seed
```

### 6. Start the Development Server

```bash
npm run dev
```

The application should now be running at: **http://localhost:3000**

## Verify Installation

1. **Homepage** - Visit http://localhost:3000
   - You should see the landing page with hero section

2. **Map Page** - Click "Explore Map" or visit /map
   - Google Maps should load
   - Try adding a filter

3. **Authentication** - Click "Sign Up"
   - You should be redirected to Clerk sign-up
   - Create an account
   - You should be redirected back to the app

4. **Add Location** - After signing in, go to /map
   - Click "Add Location"
   - Fill out the form
   - Submit to create a location

5. **View Location** - Click on a location marker
   - View location details
   - Upload a photo
   - Write a review

## Troubleshooting

### Database Connection Error

```
Error: Can't reach database server at localhost:5432
```

**Solution:** Make sure Docker is running and the database container is up:

```bash
docker-compose up -d
docker-compose ps
```

### Clerk Authentication Not Working

**Solution:** Check that:

- `.env` has correct CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
- Clerk dashboard paths are configured correctly
- You restarted the dev server after adding env variables

### Google Maps Not Loading

**Solution:**

- Verify GOOGLE_MAPS_API_KEY in `.env`
- Check that Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for specific error messages

### Image Upload Failing

**Solution:**

- Verify Cloudinary credentials in `.env`
- Make sure upload preset is "unsigned"
- Check file size (max 10MB by default)

### Port 3000 Already in Use

```bash
# Use a different port
PORT=3001 npm run dev
```

## Next Steps

1. **Explore the App**
   - Add some locations
   - Write reviews
   - Upload photos
   - Save favorites

2. **Development**
   - Read `AGENTS.md` for coding guidelines
   - Check `README.md` for full documentation
   - Explore the codebase structure

3. **Testing**

   ```bash
   npm run test:unit
   npm run test:e2e
   ```

4. **Database Management**
   ```bash
   # Open Prisma Studio (visual database editor)
   npm run prisma:studio
   ```

## Getting Help

- Check the main `README.md` for detailed documentation
- Review `design/tech-stack.md` for architecture details
- Read `design/app-layout.md` for component structure
- Check API endpoint documentation in README

## Clean Up

When you're done:

```bash
# Stop the development server
# Press Ctrl+C in the terminal

# Stop Docker containers
docker-compose down

# (Optional) Remove database data
docker-compose down -v
```

---

**Happy Coding! 🐾**
