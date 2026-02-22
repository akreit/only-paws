<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div v-if="error" class="py-12 text-center">
      <svg
        class="mx-auto mb-4 h-16 w-16 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="mb-4 text-xl text-gray-700">{{ error }}</p>
      <NuxtLink to="/map">
        <Button variant="primary">Back to Map</Button>
      </NuxtLink>
    </div>
    <div v-else-if="location" class="space-y-6">
      <!-- Header with Favorite -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ location.name }}</h1>
        </div>
        <button
          class="inline-flex items-center text-gray-600 transition-colors hover:text-gray-900"
          @click="$router.back()"
        >
          <svg class="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>

      <!-- Location Info -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <LocationInfo :location="location" />
          <DogFeatures :location="location" />
        </div>
        <div>
          <FavoriteButton v-if="isSignedIn" size="lg" show-label :location-id="location.id" />
        </div>
      </div>

      <!-- Reviews Section -->
      <div class="rounded-lg bg-white p-6 shadow-md">
        <h3 class="mb-4 text-lg font-semibold text-gray-900">Reviews</h3>
        <div class="space-y-6">
          <!-- Review Form -->
          <div v-if="isSignedIn" class="mb-6">
            <ReviewForm :location-id="location.id" @submitted="refreshLocation" />
          </div>

          <!-- Reviews List -->
          <div v-if="location.reviews && location.reviews.length > 0" class="space-y-4">
            <ReviewCard
              v-for="review in location.reviews"
              :key="review.id"
              :review="review"
              @delete="refreshLocation"
            />
          </div>
          <div v-else class="py-8 text-center text-gray-500">
            <svg
              class="mx-auto mb-3 h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p>No reviews yet</p>
          </div>
        </div>
      </div>

      <!-- Photo Gallery -->
      <PhotoGallery
        :photos="location.photos || []"
        :location-id="location.id"
        @photo-uploaded="refreshLocation"
        @photo-deleted="refreshLocation"
      />
    </div>
    <div v-else class="flex justify-center py-12">
      <LoadingSpinner size="lg" text="Loading location..." />
    </div>
  </div>
</template>

<script setup lang="ts">
import DogFeatures from '~/components/location/DogFeatures.vue'
import FavoriteButton from '~/components/location/FavoriteButton.vue'
import ReviewForm from '~/components/location/ReviewForm.vue'
import Button from '~/components/ui/Button.vue'
import ReviewCard from '~/components/location/ReviewCard.vue'
import PhotoGallery from '~/components/location/PhotoGallery.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'

const route = useRoute()
const { isSignedIn } = useAuth()
const { fetchLocation, selectedLocation: location, error } = useLocations()

const locationId = computed(() => route.params.id as string)

onMounted(async () => {
  if (locationId.value) {
    await fetchLocation(locationId.value)
  }
})

async function refreshLocation() {
  if (locationId.value) {
    await fetchLocation(locationId.value)
  }
}

useHead({
  title: computed(() =>
    location.value ? `${location.value.name} - Only Paws` : 'Location - Only Paws'
  ),
})
</script>
