<template>
  <div class="h-[calc(100vh-4rem)]">
    <div class="relative h-full">
      <!-- Map Container -->
      <div ref="mapContainer" class="absolute inset-0" />

      <!-- Controls Overlay -->
      <div class="absolute left-4 right-4 top-4 z-10 flex flex-col gap-4 sm:flex-row">
        <!-- Search & Filters -->
        <div class="max-w-md flex-1 rounded-lg bg-white p-4 shadow-lg">
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

        <!-- Add Location Button -->
        <div v-if="isSignedIn" class="flex-shrink-0">
          <Button variant="primary" @click="showAddModal = true">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Location
          </Button>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="loading" class="absolute left-1/2 top-20 z-10 -translate-x-1/2 transform">
        <div class="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg">
          <LoadingSpinner size="sm" />
          <span class="text-sm text-gray-700">Loading locations...</span>
        </div>
      </div>
    </div>

    <!-- Add Location Modal -->
    <Modal v-model="showAddModal" title="Add New Location" size="lg">
      <AddLocationForm @submitted="handleLocationAdded" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { debounce } from '~/utils/helpers'
import { LocationType } from '~/types'
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS, LOCATION_TYPE_COLORS } from '~/utils/constants'
import Input from '~/components/ui/Input.vue'
import Button from '~/components/ui/Button.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Modal from '~/components/ui/Modal.vue'
import AddLocationForm from '~/components/location/AddLocationForm.vue'

const { isSignedIn } = useAuth()
const { fetchLocations, locations, loading } = useLocations()
const { initializeMap, createMarker } = useMap()

const mapContainer = ref<HTMLElement>()
const showAddModal = ref(false)
const searchQuery = ref('')
const selectedType = ref<LocationType | null>(null)

let mapInstance: google.maps.Map | null = null
const markers: google.maps.Marker[] = []

const locationTypes = computed(() => {
  return Object.values(LocationType).map((type) => ({
    value: type,
    label: LOCATION_TYPE_LABELS[type],
    icon: LOCATION_TYPE_ICONS[type],
  }))
})

onMounted(async () => {
  await initMap()
  await loadLocations()
})

async function initMap() {
  if (!mapContainer.value) return

  try {
    mapInstance = await initializeMap(mapContainer.value)
  } catch (error) {
    console.error('Failed to initialize map:', error)
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

  // Fit bounds to show all markers
  if (markers.length > 0) {
    const bounds = new google.maps.LatLngBounds()
    markers.forEach((marker) => {
      const position = marker.getPosition()
      if (position) bounds.extend(position)
    })
    mapInstance.fitBounds(bounds)
  }
}

const handleSearch = debounce(() => {
  loadLocations()
}, 500)

function toggleFilter(type: LocationType) {
  selectedType.value = selectedType.value === type ? null : type
  loadLocations()
}

function handleLocationAdded() {
  showAddModal.value = false
  loadLocations()
}

useHead({
  title: 'Map - Only Paws',
})
</script>
