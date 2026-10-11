<template>
  <div
    class="relative h-[calc(100vh-4rem)] overflow-hidden"
    :style="{ '--map-sheet-inset': `${sheetInset}px` }"
  >
    <!-- Map Container -->
    <!-- On mobile the bottom sheet takes its height off the map so Google's controls and
         attribution stay visible; custom controls in map.controls follow automatically. -->
    <div ref="mapContainer" class="h-[calc(100%-var(--map-sheet-inset,0px))] w-full" />

    <!-- Left column (sm+): search controls with the stored-place panel docked beneath.
         On mobile the children position themselves (the panel becomes a bottom sheet). -->
    <div
      class="pointer-events-none sm:absolute sm:bottom-4 sm:left-4 sm:top-4 sm:z-10 sm:flex sm:w-[min(28rem,calc(100%-2rem))] sm:flex-col sm:gap-3"
    >
      <!-- Controls Overlay -->
      <div class="pointer-events-auto absolute left-4 right-4 top-4 z-10 sm:static">
        <!-- Search & Filters -->
        <div class="max-w-md rounded-lg bg-white p-4 shadow-lg">
          <MapSearchBox
            v-model="search.query.value"
            :model="search.model.value"
            :loading="search.loading.value"
            :places-unavailable="search.placesUnavailable.value"
            @select="search.select"
            @focus="prefetchPlaces"
          />

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="type in locationTypes"
              :key="type.value"
              :class="[
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                selectedType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ]"
              @click="toggleFilter(type.value)"
            >
              {{ type.icon }} {{ type.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Saved places unavailable (e.g. database down); map stays usable -->
      <div
        v-if="locationsError"
        class="pointer-events-auto absolute left-4 right-4 top-44 z-10 max-w-md sm:static"
        role="status"
      >
        <div class="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-lg">
          {{ locationsError }}. You can still explore the map.
        </div>
      </div>

      <!-- Stored place: bottom sheet on mobile, docked under the search on sm+ -->
      <MapLocationPanel
        v-if="selectedSavedLocation"
        ref="locationPanel"
        :location="selectedSavedLocation"
        class="pointer-events-auto absolute inset-x-0 bottom-0 z-20 sm:static sm:min-h-0 sm:w-96 sm:max-w-full"
        @close="dismissAll"
      />
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="absolute left-1/2 top-20 z-10 -translate-x-1/2 transform">
      <div class="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg">
        <LoadingSpinner size="sm" />
        <span class="text-sm text-gray-700">Loading locations...</span>
      </div>
    </div>

    <!-- Marker Legend: hidden while the stored-place panel is open (it shares the left column /
         bottom edge) and on small screens while the preview card is open -->
    <div
      :class="[
        'absolute bottom-8 left-4 z-10 max-w-[calc(100%-2rem)]',
        selectedSavedLocation ? 'hidden' : '',
        selectedPlace || placeDetailsLoading ? 'hidden sm:block' : '',
      ]"
    >
      <button
        type="button"
        class="rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-lg hover:bg-gray-50"
        :aria-expanded="showLegend"
        aria-controls="map-legend"
        @click="showLegend = !showLegend"
      >
        {{ showLegend ? 'Hide legend' : 'Legend' }}
      </button>
      <ul
        v-show="showLegend"
        id="map-legend"
        aria-label="Map marker legend"
        class="mt-2 max-h-[40vh] overflow-y-auto rounded-lg bg-white p-3 shadow-lg"
      >
        <li v-for="type in locationTypes" :key="type.value" class="flex items-center gap-2 py-0.5">
          <img :src="type.markerUrl" alt="" class="h-[25px] w-[18px]" />
          <span class="text-sm text-gray-700">{{ type.label }}</span>
        </li>
      </ul>
    </div>

    <div v-if="placeDetailsLoading" class="absolute bottom-4 right-4 z-10">
      <div class="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg">
        <LoadingSpinner size="sm" />
        <span class="text-sm text-gray-700">Loading place details...</span>
      </div>
    </div>

    <MapPlacePreviewCard
      v-else-if="selectedPlace"
      :place="selectedPlace"
      :location-type="selectedPlaceLocationType"
      :is-signed-in="!!isSignedIn"
      :existing-location-id="existingLocationForSelectedPlace?.id"
      @add="handleAddSelectedPlace"
      @dismiss="dismissAll"
      @open-location="handleOpenLocation"
    />
  </div>

  <!-- Add Location Modal -->
  <Modal
    v-model="showAddModal"
    :title="selectedPlace ? `Add ${selectedPlace.name}` : 'Add Location'"
    size="lg"
  >
    <AddLocationForm
      v-if="selectedPlace"
      :initial-location="selectedPlaceInput"
      :lock-basic-fields="true"
      :show-basic-info-section="false"
      @submitted="handleLocationAdded"
    />
  </Modal>
</template>

<script setup lang="ts">
import { LocationType, type CreateLocationInput, type Location } from '~/types'
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS } from '~/utils/constants'
import { useElementBounding, useMediaQuery } from '@vueuse/core'
import { getMarkerIcon, toGoogleIcon } from '~/utils/map-markers'
import { mapSheetInset } from '~/utils/map-layout'
import {
  buildLocationInputFromGooglePlace,
  inferLocationTypeFromGoogleTypes,
} from '~/utils/google-place'
import MapSearchBox from '~/components/map/MapSearchBox.vue'
import { useMapPlaceQuery } from '~/composables/useMapPlaceQuery'
import { useMapSearch } from '~/composables/useMapSearch'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Modal from '~/components/ui/Modal.vue'
import AddLocationForm from '~/components/location/AddLocationForm.vue'
import MapLocationPanel from '~/components/location/MapLocationPanel.vue'
import MapPlacePreviewCard from '~/components/location/MapPlacePreviewCard.vue'

const { isSignedIn } = useAuth()
const route = useRoute()
const router = useRouter()
const { locations, loading, error: locationsError } = useLocations()
const { loadGoogleMaps, initializeMap, centerOnUserOnce, createMarker, prefetchPlaces } = useMap()

const mapContainer = ref<HTMLElement>()
const locationPanel = ref<InstanceType<typeof MapLocationPanel>>()
const showAddModal = ref(false)
const selectedType = ref<LocationType | null>(null)

let mapInstance: google.maps.Map | null = null
const markers: google.maps.Marker[] = []
let mapClickListener: google.maps.MapsEventListener | null = null
let mounted = false
// Place opened from the URL before the map existed; focused once it does
let pendingFocus: Location | null = null

// Start downloading the Maps JS as early as possible (before hydration finishes)
if (import.meta.client) {
  loadGoogleMaps().catch(() => {})
}

const search = useMapSearch({
  getMap: () => mapInstance,
  selectedType,
  onLocationsUpdated: updateMarkers,
  requestOpenLocation: (location) => placeQuery.open(location),
})
const { selectedPlace, selectedSavedLocation, placeDetailsLoading } = search

const isMobile = useMediaQuery('(max-width: 639px)')
const { height: panelHeight } = useElementBounding(() => locationPanel.value?.$el as HTMLElement)
const sheetInset = computed(() =>
  mapSheetInset({
    isMobile: isMobile.value,
    open: !!selectedSavedLocation.value,
    height: panelHeight.value,
  })
)

const placeQuery = useMapPlaceQuery({
  route,
  router,
  locations,
  selectedSavedLocation,
  openLocation: search.openLocation,
  closeLocation: search.dismiss,
  focusLocation,
  fetchLocation: (id) => $fetch<Location>(`/api/locations/${id}`),
})

// A Google place preview replaces the stored-place panel, so drop it from the URL
watch(
  () => !!selectedPlace.value || placeDetailsLoading.value,
  (active) => {
    if (active) placeQuery.clear()
  }
)

const showLegend = ref(false)

const locationTypes = computed(() => {
  return Object.values(LocationType).map((type) => ({
    value: type,
    label: LOCATION_TYPE_LABELS[type],
    icon: LOCATION_TYPE_ICONS[type],
    markerUrl: getMarkerIcon(type).url,
  }))
})

const existingLocationForSelectedPlace = computed<Location | null>(() => {
  if (!selectedPlace.value?.placeId) {
    return null
  }

  return (
    locations.value.find((location) => location.googlePlaceId === selectedPlace.value?.placeId) ||
    null
  )
})

const selectedPlaceLocationType = computed(() => {
  return selectedPlace.value
    ? inferLocationTypeFromGoogleTypes(selectedPlace.value.types)
    : LocationType.OTHER
})

const selectedPlaceInput = computed<CreateLocationInput | undefined>(() => {
  return selectedPlace.value ? buildLocationInputFromGooglePlace(selectedPlace.value) : undefined
})

onMounted(async () => {
  mounted = true
  // Locations, geolocation and the Maps script load in parallel; none blocks the others
  void search.refreshLocations()
  centerOnUserOnce({ isActive: () => mounted })
  await initMap()
  // Locations may have arrived before the map existed, when drawing was a no-op
  updateMarkers()
})

onBeforeUnmount(() => {
  mounted = false
  mapClickListener?.remove()
})

async function initMap() {
  if (!mapContainer.value) return

  try {
    mapInstance = await initializeMap(mapContainer.value)
    bindPlaceClickListener()
    if (pendingFocus) focusLocation(pendingFocus)
  } catch (error) {
    console.error('Failed to initialize map:', error)
  }
}

function bindPlaceClickListener() {
  if (!mapInstance) return

  mapClickListener?.remove()
  mapClickListener = mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
    handleMapClick(event)
  })
}

function handleMapClick(event: google.maps.MapMouseEvent) {
  const placeClickEvent = event as google.maps.MapMouseEvent & {
    placeId?: string
    stop?: () => void
  }
  const { placeId } = placeClickEvent

  if (!placeId) {
    dismissAll()
    return
  }

  placeClickEvent.stop?.()
  void search.selectPlaceId(placeId, event.latLng)
}

function updateMarkers() {
  if (!mapInstance) return

  // Clear existing markers
  markers.forEach((marker) => marker.setMap(null))
  markers.length = 0

  // Create new markers
  locations.value.forEach((location) => {
    const marker = createMarker({
      map: mapInstance!,
      position: { lat: location.latitude, lng: location.longitude },
      title: location.name,
      icon: toGoogleIcon(getMarkerIcon(location.type)),
      onClick: () => placeQuery.open(location),
    })

    markers.push(marker)
  })
}

function focusLocation(location: Location) {
  if (!mapInstance) {
    pendingFocus = location
    return
  }
  pendingFocus = null
  mapInstance.panTo({ lat: location.latitude, lng: location.longitude })
  mapInstance.setZoom(16)
}

/** Closes whatever is open (stored panel or Google preview) and removes `place` from the URL. */
function dismissAll() {
  search.dismiss()
  placeQuery.clear()
}

function toggleFilter(type: LocationType) {
  selectedType.value = selectedType.value === type ? null : type
}

async function handleAddSelectedPlace() {
  if (!selectedPlace.value) return

  if (existingLocationForSelectedPlace.value) {
    placeQuery.open(existingLocationForSelectedPlace.value)
    return
  }

  showAddModal.value = true
}

function handleOpenLocation(locationId: string) {
  placeQuery.openById(locationId)
}

async function handleLocationAdded(location: Location) {
  showAddModal.value = false
  dismissAll()
  await search.refreshLocations()
  await navigateTo(`/locations/${location.id}`)
}

useHead({
  title: 'Map - Only Paws',
  // No crossorigin: the Maps script, tiles and icons are fetched in no-cors mode
  link: [
    { rel: 'preconnect', href: 'https://maps.googleapis.com' },
    { rel: 'preconnect', href: 'https://maps.gstatic.com' },
  ],
})
</script>
