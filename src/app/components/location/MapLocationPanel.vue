<template>
  <section
    role="dialog"
    aria-modal="false"
    :aria-labelledby="headingId"
    class="flex max-h-[60vh] flex-col overflow-y-auto bg-white shadow-2xl max-sm:rounded-t-2xl sm:max-h-full sm:rounded-2xl"
    data-testid="map-location-panel"
  >
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
            {{ location.phone }}
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
import { parseAmenities } from '~/utils/helpers'
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

const features = computed(() => {
  const { leashRequired, offLeashArea, breedRestrictions, amenities } = props.location
  const list: string[] = []
  if (leashRequired === true) list.push('Leash required')
  if (leashRequired === false) list.push('Leash optional')
  if (offLeashArea) list.push('Off-leash area')
  if (breedRestrictions) list.push(`Breed restrictions: ${breedRestrictions}`)
  return [...list, ...parseAmenities(amenities)]
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

function focusHeading() {
  void nextTick(() => heading.value?.focus({ preventScroll: true }))
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  focusHeading()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
watch(() => props.location.id, focusHeading)
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
