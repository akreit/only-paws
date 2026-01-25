<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner size="lg" text="Loading profile..." />
    </div>

    <div v-else-if="!isSignedIn" class="text-center py-12">
      <svg class="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
      <p class="text-gray-600 mb-6">Please sign in to view your profile</p>
      <NuxtLink to="/sign-in">
        <Button variant="primary">Sign In</Button>
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <!-- Profile Header -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center gap-6">
          <img
            v-if="user?.imageUrl"
            :src="user.imageUrl"
            :alt="user.username || 'User'"
            class="h-24 w-24 rounded-full border-4 border-gray-200"
          >
          <div v-else class="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
            <svg class="h-12 w-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>

          <div class="flex-1">
            <h1 class="text-3xl font-bold text-gray-900">
              {{ user?.username || user?.firstName || 'User' }}
            </h1>
            <p v-if="user?.primaryEmailAddress?.emailAddress" class="text-gray-600 mt-1">
              {{ user.primaryEmailAddress.emailAddress }}
            </p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
          <div class="text-3xl font-bold text-blue-600">
            {{ userLocations.length }}
          </div>
          <p class="text-gray-600 mt-1">Locations Added</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
          <div class="text-3xl font-bold text-green-600">
            {{ userReviews.length }}
          </div>
          <p class="text-gray-600 mt-1">Reviews Written</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
          <div class="text-3xl font-bold text-purple-600">
            {{ favoriteLocations.length }}
          </div>
          <p class="text-gray-600 mt-1">Favorites</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-lg shadow-md">
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="[
                'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              ]"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- My Locations Tab -->
          <div v-if="activeTab === 'locations'">
            <div v-if="userLocations.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <LocationCard
                v-for="location in userLocations"
                :key="location.id"
                :location="location"
              />
            </div>
            <div v-else class="text-center py-12 text-gray-500">
              <svg class="h-16 w-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>You haven't added any locations yet</p>
              <NuxtLink to="/map" class="mt-4 inline-block">
                <Button variant="primary" size="sm">Add Your First Location</Button>
              </NuxtLink>
            </div>
          </div>

          <!-- Favorites Tab -->
          <div v-if="activeTab === 'favorites'">
            <div v-if="favoriteLocations.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <LocationCard
                v-for="location in favoriteLocations"
                :key="location.id"
                :location="location"
              />
            </div>
            <div v-else class="text-center py-12 text-gray-500">
              <svg class="h-16 w-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p>You haven't saved any favorites yet</p>
              <NuxtLink to="/map" class="mt-4 inline-block">
                <Button variant="primary" size="sm">Explore Locations</Button>
              </NuxtLink>
            </div>
          </div>

          <!-- Activity Tab -->
          <div v-if="activeTab === 'activity'">
            <div v-if="userReviews.length > 0" class="space-y-4">
              <div
                v-for="review in userReviews"
                :key="review.id"
                class="border border-gray-200 rounded-lg p-4"
              >
                <div class="flex items-start justify-between mb-2">
                  <NuxtLink
                    :to="`/locations/${review.locationId}`"
                    class="font-medium text-blue-600 hover:underline"
                  >
                    View Location
                  </NuxtLink>
                  <span class="text-sm text-gray-500">
                    {{ formatRelativeTime(review.createdAt) }}
                  </span>
                </div>
                <Rating :model-value="review.rating" :readonly="true" size="sm" class="mb-2" />
                <p v-if="review.comment" class="text-gray-700">{{ review.comment }}</p>
              </div>
            </div>
            <div v-else class="text-center py-12 text-gray-500">
              <svg class="h-16 w-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p>You haven't written any reviews yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Location, Review } from '~/types'
import { formatRelativeTime } from '~/utils/formatters'
import Rating from '~/components/ui/Rating.vue'
import Button from '~/components/ui/Button.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'

const { isSignedIn } = useAuth()
const { user } = useUser()
const { fetchFavorites } = useFavorites()

const loading = ref(true)
const activeTab = ref('locations')

const tabs = [
  { id: 'locations', label: 'My Locations' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'activity', label: 'Activity' },
]

const userLocations = ref<Location[]>([])
const userReviews = ref<Review[]>([])
const favoriteLocations = ref<Location[]>([])

onMounted(async () => {
  if (isSignedIn.value) {
    await Promise.all([
      loadUserData(),
      loadFavorites(),
    ])
  }
  loading.value = false
})

async function loadUserData() {
  try {
    // Fetch user's locations and reviews
    const data = await $fetch<{ locations: Location[]; reviews: Review[] }>('/api/users/profile')
    userLocations.value = data.locations || []
    userReviews.value = data.reviews || []
  } catch (error) {
    console.error('Failed to load user data:', error)
  }
}

async function loadFavorites() {
  try {
    const favoriteIds = await fetchFavorites()

    // Fetch full location data for favorites
    if (favoriteIds.length > 0) {
      const locations = await $fetch<Location[]>('/api/locations')
      favoriteLocations.value = locations.filter((loc) =>
        favoriteIds.includes(loc.id)
      )
    }
  } catch (error) {
    console.error('Failed to load favorites:', error)
  }
}

useHead({
  title: 'My Profile - Only Paws',
})
</script>
