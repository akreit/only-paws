<template>
  <section
    role="dialog"
    aria-modal="false"
    :aria-labelledby="headingId"
    class="flex max-h-[60vh] flex-col overflow-y-auto bg-white shadow-2xl max-sm:rounded-t-2xl max-sm:pb-[env(safe-area-inset-bottom)] sm:max-h-full sm:rounded-2xl"
    data-testid="map-location-panel"
    @keydown.esc="emit('close')"
  >
    <div
      aria-hidden="true"
      class="mx-auto mt-2 h-1.5 w-10 flex-shrink-0 rounded-full bg-gray-300 sm:hidden"
    />
    <img
      v-if="photo"
      :src="photo.url"
      :alt="photo.caption || location.name"
      loading="lazy"
      decoding="async"
      class="h-40 w-full flex-shrink-0 object-cover"
    />

    <div class="space-y-3 p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div
            class="mb-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
            :style="{ backgroundColor: LOCATION_TYPE_COLORS[location.type] }"
          >
            {{ LOCATION_TYPE_ICONS[location.type] }} {{ LOCATION_TYPE_LABELS[location.type] }}
          </div>
          <h2
            :id="headingId"
            ref="heading"
            tabindex="-1"
            class="text-lg font-semibold text-gray-900 focus:outline-none"
          >
            {{ location.name }}
          </h2>
        </div>

        <button
          type="button"
          class="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close place details"
          @click="emit('close')"
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

      <div class="flex items-center gap-2 text-sm text-gray-600">
        <Rating :model-value="location.averageRating || 0" :readonly="true" size="sm" />
        <span v-if="location.averageRating">{{ formatRating(location.averageRating) }}</span>
        <span>({{ reviewCount }} {{ reviewCount === 1 ? 'review' : 'reviews' }})</span>
        <span v-if="favoriteCount" class="text-gray-500">· ❤️ {{ favoriteCount }}</span>
      </div>

      <p class="text-sm text-gray-600">📍 {{ location.address }}</p>

      <p v-if="location.description" class="line-clamp-4 text-sm text-gray-700">
        {{ location.description }}
      </p>

      <ul
        v-if="features.length > 0"
        aria-label="Dog-friendly features"
        class="flex flex-wrap gap-2"
      >
        <li
          v-for="feature in features"
          :key="feature"
          class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
        >
          {{ feature }}
        </li>
      </ul>

      <div v-if="location.website || location.phone" class="space-y-1 text-sm">
        <div v-if="location.phone">
          📞
          <a :href="`tel:${location.phone}`" class="text-blue-600 hover:underline">
            {{ formatPhoneNumber(location.phone) }}
          </a>
        </div>
        <div v-if="location.website">
          🌐
          <a
            :href="location.website"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:underline"
          >
            Website
          </a>
        </div>
      </div>

      <NuxtLink
        :to="`/locations/${location.id}`"
        class="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Details
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Location } from '~/types'
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS, LOCATION_TYPE_COLORS } from '~/utils/constants'
import { formatPhoneNumber, formatRating } from '~/utils/formatters'
import { parseAmenities } from '~/utils/helpers'
import { locationFeatureLabels } from '~/utils/location-features'
import Rating from '~/components/ui/Rating.vue'

interface Props {
  location: Location
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const heading = ref<HTMLElement>()
const headingId = computed(() => `map-location-panel-title-${props.location.id}`)
const photo = computed(() => props.location.photos?.[0])
const reviewCount = computed(
  () => props.location._count?.reviews ?? props.location.reviews?.length ?? 0
)
const favoriteCount = computed(() => props.location._count?.favorites ?? 0)

const features = computed(() => [
  ...locationFeatureLabels(props.location).map(({ key, label, detail }) =>
    key === 'breedRestrictions' ? `${label}: ${detail}` : label
  ),
  ...parseAmenities(props.location.amenities),
])

function focusHeading() {
  void nextTick(() => heading.value?.focus({ preventScroll: true }))
}

// Element that had focus before the panel took it; restored on close
let opener: HTMLElement | null = null

onMounted(() => {
  opener = document.activeElement as HTMLElement | null
  focusHeading()
})
onBeforeUnmount(() => {
  if (opener && opener !== document.body && opener.isConnected) opener.focus()
})
watch(() => props.location.id, focusHeading)
</script>
