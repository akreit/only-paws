<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h1 class="mb-6 text-5xl font-bold text-gray-900 md:text-6xl">
            🐾 Discover Dog-Friendly Places
          </h1>
          <p class="mx-auto mb-8 max-w-2xl text-xl text-gray-700">
            Find and share the best dog-friendly restaurants, parks, stores, and more. Your perfect
            adventure with your furry friend starts here!
          </p>
          <div class="flex flex-col justify-center gap-4 sm:flex-row">
            <NuxtLink to="/map">
              <Button variant="primary" size="lg">
                <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Explore Map
              </Button>
            </NuxtLink>
            <NuxtLink v-if="!isSignedIn" to="/sign-up">
              <Button variant="outline" size="lg"> Get Started Free </Button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="bg-white py-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="mb-12 text-center text-3xl font-bold text-gray-900">Why Choose Only Paws?</h2>
        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div class="text-center">
            <div
              class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"
            >
              <svg
                class="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <h3 class="mb-2 text-xl font-semibold text-gray-900">Interactive Map</h3>
            <p class="text-gray-600">
              Explore dog-friendly locations on an intuitive map interface
            </p>
          </div>

          <div class="text-center">
            <div
              class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
            >
              <svg
                class="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <h3 class="mb-2 text-xl font-semibold text-gray-900">Reviews & Ratings</h3>
            <p class="text-gray-600">Read and share experiences from the dog-loving community</p>
          </div>

          <div class="text-center">
            <div
              class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100"
            >
              <svg
                class="h-8 w-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 class="mb-2 text-xl font-semibold text-gray-900">Photo Sharing</h3>
            <p class="text-gray-600">Upload and view photos of your adventures with your pup</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Locations Section -->
    <section class="bg-gray-50 py-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="mb-12 text-center text-3xl font-bold text-gray-900">Featured Locations</h2>

        <div v-if="loading" class="flex justify-center">
          <LoadingSpinner size="lg" text="Loading locations..." />
        </div>

        <div
          v-else-if="locations.length > 0"
          class="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <LocationCard
            v-for="location in locations.slice(0, 6)"
            :key="location.id"
            :location="location"
          />
        </div>

        <div v-else class="py-12 text-center text-gray-500">
          <p>No locations found yet. Be the first to add one!</p>
        </div>

        <div class="text-center">
          <NuxtLink to="/map">
            <Button variant="outline">View All Locations</Button>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="bg-blue-600 py-16">
      <div class="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 class="mb-4 text-3xl font-bold text-white">Ready to Explore?</h2>
        <p class="mb-8 text-xl text-blue-100">
          Join our community and start discovering amazing dog-friendly places today!
        </p>
        <NuxtLink v-if="!isSignedIn" to="/sign-up">
          <Button variant="secondary" size="lg"> Sign Up Now </Button>
        </NuxtLink>
        <NuxtLink v-else to="/map">
          <Button variant="secondary" size="lg"> Start Exploring </Button>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Button from '~/components/ui/Button.vue'

const { isSignedIn } = useAuth()
const { fetchLocations, locations, loading } = useLocations()

// Fetch featured locations on mount
onMounted(() => {
  fetchLocations()
})

// SEO
useHead({
  title: 'Only Paws - Discover Dog-Friendly Locations',
  meta: [
    {
      name: 'description',
      content:
        'Find and share the best dog-friendly restaurants, parks, stores, and more. Your perfect adventure with your furry friend starts here!',
    },
  ],
})
</script>
