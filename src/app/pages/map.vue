<template>
  <div class="relative h-[calc(100vh-4rem)] overflow-hidden">
    <!-- Map Container -->
    <div ref="mapContainer" class="h-full w-full" />

    <!-- Controls Overlay -->
    <div class="absolute left-4 right-4 top-4 z-10">
      <!-- Search & Filters -->
      <div class="max-w-md rounded-lg bg-white p-4 shadow-lg">
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="Search locations..."
          @input="handleSearch"
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

    <!-- Loading Indicator -->
    <div v-if="loading" class="absolute left-1/2 top-20 z-10 -translate-x-1/2 transform">
      <div class="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg">
        <LoadingSpinner size="sm" />
        <span class="text-sm text-gray-700">Loading locations...</span>
      </div>
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
      @dismiss="selectedPlace = null"
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
import {
  LocationType,
  type CreateLocationInput,
  type Location,
  type GooglePlaceDetails,
} from '~/types'
import { debounce } from '~/utils/helpers'
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS, LOCATION_TYPE_COLORS } from '~/utils/constants'
import {
  buildLocationInputFromGooglePlace,
  inferLocationTypeFromGoogleTypes,
} from '~/utils/google-place'
import Input from '~/components/ui/Input.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Modal from '~/components/ui/Modal.vue'
import AddLocationForm from '~/components/location/AddLocationForm.vue'
import MapPlacePreviewCard from '~/components/location/MapPlacePreviewCard.vue'

const { isSignedIn } = useAuth()
const notifications = useNotificationsStore()
const { fetchLocations, locations, loading } = useLocations()
const { initializeMap, createMarker, mapStore, getPlaceDetails } = useMap()

const mapContainer = ref<HTMLElement>()
const showAddModal = ref(false)
const searchQuery = ref('')
const selectedType = ref<LocationType | null>(null)
const selectedPlace = ref<GooglePlaceDetails | null>(null)
const placeDetailsLoading = ref(false)

let mapInstance: google.maps.Map | null = null
const markers: google.maps.Marker[] = []
let mapClickListener: google.maps.MapsEventListener | null = null

const locationTypes = computed(() => {
  return Object.values(LocationType).map((type) => ({
    value: type,
    label: LOCATION_TYPE_LABELS[type],
    icon: LOCATION_TYPE_ICONS[type],
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
  await resolveCenter()
  await initMap()
  await loadLocations()
})

onBeforeUnmount(() => {
  mapClickListener?.remove()
})

function resolveCenter(): Promise<void> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve()
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapStore.setCenter({ lat: coords.latitude, lng: coords.longitude })
        resolve()
      },
      () => resolve()
    )
  })
}

async function initMap() {
  if (!mapContainer.value) return

  try {
    mapInstance = await initializeMap(mapContainer.value)
    bindPlaceClickListener()
  } catch (error) {
    console.error('Failed to initialize map:', error)
  }
}

function bindPlaceClickListener() {
  if (!mapInstance) return

  mapClickListener?.remove()
  mapClickListener = mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
    void handleMapClick(event)
  })
}

async function handleMapClick(event: google.maps.MapMouseEvent) {
  if (!mapInstance) return

  const placeClickEvent = event as google.maps.MapMouseEvent & {
    placeId?: string
    stop?: () => void
  }

  if (!placeClickEvent.placeId) {
    selectedPlace.value = null
    return
  }

  placeClickEvent.stop?.()
  placeDetailsLoading.value = true

  try {
    const place = await getPlaceDetails(mapInstance, placeClickEvent.placeId)

    if (!place) {
      selectedPlace.value = null
      notifications.error('Could not load details for that place')
      return
    }

    selectedPlace.value = place

    if (event.latLng) {
      mapInstance.panTo(event.latLng)
    }
  } catch (error) {
    console.error('Failed to load place details:', error)
    selectedPlace.value = null
    notifications.error('Failed to load place details')
  } finally {
    placeDetailsLoading.value = false
  }
}

async function loadLocations() {
  try {
    await fetchLocations({
      type: selectedType.value || undefined,
      search: searchQuery.value || undefined,
    })
    updateMarkers()
  } catch (error) {
    console.error('Failed to load locations:', error)
  }
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
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: LOCATION_TYPE_COLORS[location.type],
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10,
      },
      onClick: () => {
        navigateTo(`/locations/${location.id}`)
      },
    })

    markers.push(marker)
  })
}

const handleSearch = debounce(() => {
  loadLocations()
}, 500)

function toggleFilter(type: LocationType) {
  selectedType.value = selectedType.value === type ? null : type
  loadLocations()
}

async function handleAddSelectedPlace() {
  if (!selectedPlace.value) return

  if (existingLocationForSelectedPlace.value) {
    await handleOpenLocation(existingLocationForSelectedPlace.value.id)
    return
  }

  showAddModal.value = true
}

async function handleOpenLocation(locationId: string) {
  selectedPlace.value = null
  await navigateTo(`/locations/${locationId}`)
}

async function handleLocationAdded(location: Location) {
  showAddModal.value = false
  selectedPlace.value = null
  await loadLocations()
  await navigateTo(`/locations/${location.id}`)
}

useHead({
  title: 'Map - Only Paws',
})
</script>
