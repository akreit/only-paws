import type { Location, CreateLocationInput, LocationFilters } from '~/types'

export function useLocations() {
  const locationsStore = useLocationsStore()
  const notifications = useNotificationsStore()

  async function fetchLocations(filters?: LocationFilters) {
    locationsStore.setLoading(true)
    locationsStore.setError(null)

    try {
      const query = new URLSearchParams()
      if (filters?.type) query.append('type', filters.type)
      if (filters?.search) query.append('search', filters.search)
      if (filters?.latitude) query.append('latitude', filters.latitude.toString())
      if (filters?.longitude) query.append('longitude', filters.longitude.toString())
      if (filters?.radiusKm) query.append('radiusKm', filters.radiusKm.toString())

      const locations = await $fetch<Location[]>(`/api/locations?${query.toString()}`)
      locationsStore.setLocations(locations)
      return locations
    } catch (error) {
      const message = 'Failed to fetch locations'
      locationsStore.setError(message)
      notifications.error(message)
      throw error
    } finally {
      locationsStore.setLoading(false)
    }
  }

  async function fetchLocation(id: string) {
    locationsStore.setLoading(true)
    locationsStore.setError(null)

    try {
      const location = await $fetch<Location>(`/api/locations/${id}`)
      locationsStore.setSelectedLocation(location)
      return location
    } catch (error) {
      const message = 'Failed to fetch location'
      locationsStore.setError(message)
      notifications.error(message)
      throw error
    } finally {
      locationsStore.setLoading(false)
    }
  }

  async function createLocation(input: CreateLocationInput) {
    locationsStore.setLoading(true)
    locationsStore.setError(null)

    try {
      const location = await $fetch<Location>('/api/locations', {
        method: 'POST',
        body: input,
      })

      locationsStore.addLocation(location)
      notifications.success('Location created successfully!')
      return location
    } catch (error) {
      const message = 'Failed to create location'
      locationsStore.setError(message)
      notifications.error(message)
      throw error
    } finally {
      locationsStore.setLoading(false)
    }
  }

  async function deleteLocation(id: string) {
    locationsStore.setLoading(true)
    locationsStore.setError(null)

    try {
      await $fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      })

      locationsStore.removeLocation(id)
      notifications.success('Location deleted successfully!')
    } catch (error) {
      const message = 'Failed to delete location'
      locationsStore.setError(message)
      notifications.error(message)
      throw error
    } finally {
      locationsStore.setLoading(false)
    }
  }

  return {
    locations: computed(() => locationsStore.locations),
    filteredLocations: computed(() => locationsStore.filteredLocations),
    selectedLocation: computed(() => locationsStore.selectedLocation),
    loading: computed(() => locationsStore.loading),
    error: computed(() => locationsStore.error),
    fetchLocations,
    fetchLocation,
    createLocation,
    deleteLocation,
    setFilters: locationsStore.setFilters,
    clearFilters: locationsStore.clearFilters,
  }
}

