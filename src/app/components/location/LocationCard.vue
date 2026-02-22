<template>
  <div
    class="cursor-pointer overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg"
    @click="navigateToLocation"
  >
    <!-- Image -->
    <div class="relative h-48 bg-gray-200">
      <img
        v-if="location.photos && location.photos.length > 0"
        :src="location.photos[0].url"
        :alt="location.name"
        class="h-full w-full object-cover"
      >
      <div v-else class="flex h-full w-full items-center justify-center text-6xl">
        {{ LOCATION_TYPE_ICONS[location.type] }}
      </div>

      <!-- Type Badge -->
      <div
        class="absolute left-2 top-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
        :style="{ backgroundColor: LOCATION_TYPE_COLORS[location.type] }"
      >
        {{ LOCATION_TYPE_LABELS[location.type] }}
      </div>

      <!-- Favorite Button -->
      <button
        v-if="isSignedIn"
        class="absolute right-2 top-2 rounded-full bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
        @click.stop="handleFavoriteClick"
      >
        <svg
          :class="[isFavoriteLocation ? 'fill-current text-red-500' : 'text-gray-400']"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="p-4">
      <h3 class="mb-1 line-clamp-1 text-lg font-semibold text-gray-900">
        {{ location.name }}
      </h3>

      <p v-if="location.description" class="mb-3 line-clamp-2 text-sm text-gray-600">
        {{ location.description }}
      </p>

      <!-- Location Info -->
      <div class="mb-3 flex items-start gap-1 text-sm text-gray-500">
        <svg
          class="mt-0.5 h-4 w-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span class="line-clamp-1">{{ location.address }}</span>
      </div>

      <!-- Rating & Stats -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <Rating :model-value="location.averageRating || 0" :readonly="true" size="sm" />
          <span class="text-sm text-gray-600"> ({{ location._count?.reviews || 0 }}) </span>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-500">
          <div class="flex items-center gap-1">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {{ location._count?.photos || 0 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Location } from '~/types'
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS, LOCATION_TYPE_COLORS } from '~/utils/constants'
import Rating from '~/components/ui/Rating.vue'

interface Props {
  location: Location
}

const props = defineProps<Props>()

const router = useRouter()
const { isSignedIn } = useAuth()
const { isFavorite, toggleFavorite } = useFavorites()

const isFavoriteLocation = computed(() => isFavorite(props.location.id))

function navigateToLocation() {
  router.push(`/locations/${props.location.id}`)
}

async function handleFavoriteClick() {
  await toggleFavorite(props.location.id)
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
