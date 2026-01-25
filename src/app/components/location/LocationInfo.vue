<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">{{ location.name }}</h2>

    <!-- Type & Basic Info -->
    <div class="flex items-center gap-2 mb-4">
      <span
        class="px-3 py-1 rounded-full text-sm font-semibold text-white"
        :style="{ backgroundColor: LOCATION_TYPE_COLORS[location.type] }"
      >
        {{ LOCATION_TYPE_ICONS[location.type] }} {{ LOCATION_TYPE_LABELS[location.type] }}
      </span>
    </div>

    <!-- Rating -->
    <div v-if="location.averageRating" class="flex items-center gap-2 mb-4">
      <Rating :model-value="location.averageRating" :readonly="true" />
      <span class="text-gray-600">
        {{ formatRating(location.averageRating) }} ({{ location._count?.reviews || 0 }} {{ pluralize(location._count?.reviews || 0, 'review') }})
      </span>
    </div>

    <!-- Description -->
    <p v-if="location.description" class="text-gray-700 mb-6">
      {{ location.description }}
    </p>

    <!-- Contact Info -->
    <div class="space-y-3 mb-6">
      <div class="flex items-start gap-3">
        <svg class="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-gray-700">{{ location.address }}</span>
      </div>

      <div v-if="location.phone" class="flex items-center gap-3">
        <svg class="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <a :href="`tel:${location.phone}`" class="text-blue-600 hover:underline">
          {{ formatPhoneNumber(location.phone) }}
        </a>
      </div>

      <div v-if="location.website" class="flex items-center gap-3">
        <svg class="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <a :href="location.website" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
          Visit Website
        </a>
      </div>

      <div v-if="location.hours" class="flex items-start gap-3">
        <svg class="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-gray-700">{{ location.hours }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Location } from '~/types'
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS, LOCATION_TYPE_COLORS } from '~/utils/constants'
import { formatPhoneNumber, formatRating, pluralize } from '~/utils/formatters'
import Rating from '~/components/ui/Rating.vue'

interface Props {
  location: Location
}

defineProps<Props>()
</script>

