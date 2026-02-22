import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },
  srcDir: 'src/app',
  serverDir: 'src/server',

  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@clerk/nuxt',
    '@nuxt/eslint'
  ],

  runtimeConfig: {
    public: {
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      clerkFallbackRedirectUrl: '/',
      clerkSignInFallbackRedirectUrl: '/',
      clerkSignUpFallbackRedirectUrl: '/',
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      googleMapsDefaultLat: process.env.GOOGLE_MAPS_DEFAULT_LAT || '40.7128',
      googleMapsDefaultLng: process.env.GOOGLE_MAPS_DEFAULT_LNG || '-74.0060',
      googleMapsDefaultZoom: Number(process.env.GOOGLE_MAPS_DEFAULT_ZOOM) || 13,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'default'
    },
    private: {
      clerkSecretKey: process.env.CLERK_SECRET_KEY,
      databaseUrl: process.env.DATABASE_URL,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
      cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET
    }
  },

  typescript: {
    strict: false,
    typeCheck: false
  },

  // Configure app to suppress Vue Router warnings for API routes
  app: {
    head: {
      title: 'Only Paws'
    }
  },

  css: ['assets/styles/main.css'],

  vite: {
    optimizeDeps: {
      include: ['@googlemaps/js-api-loader']
    }
  }
})
