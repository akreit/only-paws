import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Location, LocationFilters } from '~/types'

export const useLocationsStore = defineStore('locations', () => {
  const locations = ref<Location[]>([])
  const selectedLocation = ref<Location | null>(null)
  const filters = ref<LocationFilters>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  function setLocations(newLocations: Location[]) {
    locations.value = newLocations
  }

  function addLocation(location: Location) {
    locations.value.push(location)
  }

  function updateLocation(updatedLocation: Location) {
    const index = locations.value.findIndex((loc) => loc.id === updatedLocation.id)
    if (index !== -1) {
      locations.value[index] = updatedLocation
    }
  }

  function removeLocation(id: string) {
    const index = locations.value.findIndex((loc) => loc.id === id)
    if (index !== -1) {
      locations.value.splice(index, 1)
    }
  }

  function setSelectedLocation(location: Location | null) {
    selectedLocation.value = location
  }

  function setFilters(newFilters: LocationFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function clearFilters() {
    filters.value = {}
  }

  function setLoading(isLoading: boolean) {
    loading.value = isLoading
  }

  function setError(errorMessage: string | null) {
    error.value = errorMessage
  }

  const filteredLocations = computed(() => {
    let result = [...locations.value]

    if (filters.value.type) {
      result = result.filter((loc) => loc.type === filters.value.type)
    }

    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      result = result.filter(
        (loc) =>
          loc.name.toLowerCase().includes(searchLower) ||
          loc.description?.toLowerCase().includes(searchLower) ||
          loc.address.toLowerCase().includes(searchLower)
      )
    }

    return result
  })

  return {
    locations,
    selectedLocation,
    filters,
    loading,
    error,
    filteredLocations,
    setLocations,
    addLocation,
    updateLocation,
    removeLocation,
    setSelectedLocation,
    setFilters,
    clearFilters,
    setLoading,
    setError,
  }
})

