<template>
  <div
    class="absolute bottom-4 right-4 z-10 max-h-[calc(100vh-7rem)] w-[min(26rem,calc(100%-2rem))] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
    data-testid="map-place-preview"
  >
    <div class="mb-4 flex items-start justify-between gap-4">
      <div>
        <div
          class="mb-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
          :style="{ backgroundColor: LOCATION_TYPE_COLORS[locationType] }"
        >
          {{ LOCATION_TYPE_ICONS[locationType] }} {{ LOCATION_TYPE_LABELS[locationType] }}
        </div>
        <h2 class="text-lg font-semibold text-gray-900">{{ place.name }}</h2>
        <p class="mt-1 text-sm text-gray-600">{{ place.address }}</p>
      </div>

      <button
        type="button"
        class="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close place preview"
        @click="$emit('dismiss')"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <div v-if="place.rating" class="mb-4 flex items-center gap-2 text-sm text-gray-700">
      <span class="font-medium">⭐ {{ place.rating.toFixed(1) }}</span>
      <span v-if="place.userRatingCount" class="text-gray-500">
        ({{ place.userRatingCount }} ratings)
      </span>
    </div>

    <div class="space-y-3 text-sm text-gray-700">
      <div v-if="place.phone" class="flex items-start gap-3">
        <span class="mt-0.5">📞</span>
        <a :href="`tel:${place.phone}`" class="text-blue-600 hover:underline">
          {{ place.phone }}
        </a>
      </div>

      <div v-if="place.website" class="flex items-start gap-3">
        <span class="mt-0.5">🌐</span>
        <a
          :href="place.website"
          target="_blank"
          rel="noopener noreferrer"
          class="break-all text-blue-600 hover:underline"
        >
          Visit website
        </a>
      </div>

      <div v-if="place.openingHours?.length" class="flex items-start gap-3">
        <span class="mt-0.5">🕒</span>
        <ul class="space-y-1">
          <li v-for="line in place.openingHours" :key="line">{{ line }}</li>
        </ul>
      </div>

      <div v-if="place.googleMapsUrl" class="flex items-start gap-3">
        <span class="mt-0.5">🗺️</span>
        <a
          :href="place.googleMapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 hover:underline"
        >
          Open in Google Maps
        </a>
      </div>
    </div>

    <div class="mt-5 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
      Add this place with its Google Maps details, then choose the dog-friendly features that
      matter.
    </div>

    <div class="mt-5 flex flex-col gap-3 sm:flex-row">
      <Button
        v-if="existingLocationId"
        variant="primary"
        full-width
        @click="$emit('openLocation', existingLocationId)"
      >
        Open in Only Paws
      </Button>

      <Button
        v-else-if="isSignedIn"
        variant="primary"
        full-width
        :loading="isAdding"
        @click="$emit('add')"
      >
        Add this location
      </Button>

      <NuxtLink
        v-else
        to="/sign-in"
        class="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Sign in to add this place
      </NuxtLink>
    </div>

    <p v-if="existingLocationId" class="mt-3 text-sm text-gray-500">
      This place is already in Only Paws.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { GooglePlaceDetails, LocationType } from '~/types'
import { LOCATION_TYPE_COLORS, LOCATION_TYPE_ICONS, LOCATION_TYPE_LABELS } from '~/utils/constants'
import Button from '~/components/ui/Button.vue'

interface Props {
  place: GooglePlaceDetails
  locationType: LocationType
  isSignedIn: boolean
  isAdding?: boolean
  existingLocationId?: string | null
}

defineProps<Props>()

defineEmits<{
  add: []
  dismiss: []
  openLocation: [locationId: string]
}>()
</script>
