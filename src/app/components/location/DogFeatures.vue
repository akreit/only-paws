<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">🐕 Dog-Friendly Features</h3>

    <div class="space-y-4">
      <!-- Leash Required -->
      <div v-if="location.leashRequired !== null" class="flex items-start gap-3">
        <svg
          :class="[location.leashRequired ? 'text-blue-600' : 'text-gray-400']"
          class="h-5 w-5 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div>
          <p class="font-medium text-gray-900">Leash {{ location.leashRequired ? 'Required' : 'Optional' }}</p>
          <p class="text-sm text-gray-600">
            {{ location.leashRequired ? 'Dogs must be kept on leash' : 'Off-leash allowed' }}
          </p>
        </div>
      </div>

      <!-- Off-Leash Area -->
      <div v-if="location.offLeashArea" class="flex items-start gap-3">
        <svg class="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div>
          <p class="font-medium text-gray-900">Off-Leash Area Available</p>
          <p class="text-sm text-gray-600">Designated area for dogs to run free</p>
        </div>
      </div>

      <!-- Breed Restrictions -->
      <div v-if="location.breedRestrictions" class="flex items-start gap-3">
        <svg class="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div>
          <p class="font-medium text-gray-900">Breed Restrictions</p>
          <p class="text-sm text-gray-600">{{ location.breedRestrictions }}</p>
        </div>
      </div>

      <!-- Amenities -->
      <div v-if="amenities.length > 0" class="flex items-start gap-3">
        <svg class="h-5 w-5 mt-0.5 flex-shrink-0 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
        </svg>
        <div>
          <p class="font-medium text-gray-900 mb-2">Amenities</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="amenity in amenities"
              :key="amenity"
              class="px-2 py-1 bg-purple-50 text-purple-700 text-sm rounded-full"
            >
              {{ amenity }}
            </span>
          </div>
        </div>
      </div>

      <!-- No Features -->
      <div v-if="!hasFeatures" class="text-center py-8 text-gray-500">
        <svg class="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No dog-friendly features listed yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Location } from '~/types'
import { parseAmenities } from '~/utils/helpers'

interface Props {
  location: Location
}

const props = defineProps<Props>()

const amenities = computed(() => parseAmenities(props.location.amenities))

const hasFeatures = computed(() => {
  return (
    props.location.leashRequired !== null ||
    props.location.offLeashArea ||
    props.location.breedRestrictions ||
    amenities.value.length > 0
  )
})
</script>

