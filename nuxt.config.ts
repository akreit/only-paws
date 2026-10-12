import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  buildDir: process.env.NUXT_BUILD_DIR || '.nuxt',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  srcDir: 'src/app',
  serverDir: 'src/server',

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@clerk/nuxt', '@nuxt/eslint'],

  runtimeConfig: {
    public: {
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      clerkFallbackRedirectUrl: '/',
      clerkSignInFallbackRedirectUrl: '/',
      clerkSignUpFallbackRedirectUrl: '/',
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,

      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'default',
      // Optional dedicated unsigned preset for profile photos; falls back to uploadPreset.
      profileUploadPreset: process.env.CLOUDINARY_PROFILE_UPLOAD_PRESET || '',
    },
    private: {
      clerkSecretKey: process.env.CLERK_SECRET_KEY,
      databaseUrl: process.env.DATABASE_URL,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
      cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },

  typescript: {
    strict: false,
    typeCheck: false,
  },

  // Configure app to suppress Vue Router warnings for API routes
  app: {
    head: {
      title: 'Only Paws',
    },
  },

  css: ['assets/styles/main.css'],

  nitro: {
    externals: {
      // Inlining breaks the dev server (".prisma/client/default" is not a valid package name),
      // so only inline for production builds (Vercel ESM/CJS fix).
      inline: process.env.NODE_ENV === 'production' ? ['@prisma/client', '@prisma/adapter-pg'] : [],
    },
  },

  vite: {
    optimizeDeps: {
      include: ['@googlemaps/js-api-loader'],
    },
  },
})
