import type { Location, CreateLocationInput, LocationFilters, UpdateLocationInput } from '~/types'
import { locationsCacheBust, markLocationsChanged } from '~/utils/locations-cache'

export const LOCATIONS_UNAVAILABLE_MESSAGE = 'Saved places are currently unavailable'

function isServiceUnavailable(error: unknown): boolean {
  const { statusCode, status } = (error ?? {}) as { statusCode?: number; status?: number }
  return (statusCode ?? status) === 503
}

// Shared across callers: only the newest list request may touch the store
let latestListRequest = 0
let listAbortController: AbortController | null = null

export function useLocations() {
  const locationsStore = useLocationsStore()
  const notifications = useNotificationsStore()

  /** Resolves to `null` when a newer request superseded this one (nothing is committed). */
  async function fetchLocations(filters?: LocationFilters): Promise<Location[] | null> {
    const requestId = ++latestListRequest
    const isLatest = () => requestId === latestListRequest
    listAbortController?.abort()
    const controller = new AbortController()
    listAbortController = controller

    locationsStore.setLoading(true)
    locationsStore.setError(null)

    try {
      const query = new URLSearchParams()
      if (filters?.type) query.append('type', filters.type)
      if (filters?.search) query.append('search', filters.search)
      if (filters?.latitude) query.append('latitude', filters.latitude.toString())
      if (filters?.longitude) query.append('longitude', filters.longitude.toString())
      if (filters?.radiusKm) query.append('radiusKm', filters.radiusKm.toString())

      const fresh = locationsCacheBust()
      if (fresh) query.append('fresh', fresh)

      const locations = await $fetch<Location[]>(`/api/locations?${query.toString()}`, {
        signal: controller.signal,
      })
      if (!isLatest()) return null

      locationsStore.setLocations(locations)
      return locations
    } catch (error) {
      // Superseded requests (including aborted ones) must not clobber newer state
      if (!isLatest()) return null

      if (isServiceUnavailable(error)) {
        // Database is down: show an inline empty state instead of a toast on every retry
        locationsStore.setLocations([])
        locationsStore.setError(LOCATIONS_UNAVAILABLE_MESSAGE)
        throw error
      }

      const message = 'Failed to fetch locations'
      locationsStore.setError(message)
      notifications.error(message)
      throw error
    } finally {
      if (isLatest()) {
        locationsStore.setLoading(false)
        listAbortController = null
      }
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

      markLocationsChanged()
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

  // Leaves the store's loading/error alone: on the detail page those drive the whole-page
  // spinner/error view, and a failed edit should only toast, not replace the page
  async function updateLocation(id: string, input: UpdateLocationInput) {
    try {
      const location = await $fetch<Location>(`/api/locations/${id}`, {
        method: 'PATCH',
        body: input,
      })

      markLocationsChanged()
      locationsStore.updateLocation(location)
      if (locationsStore.selectedLocation?.id === location.id) {
        locationsStore.setSelectedLocation(location)
      }
      notifications.success('Location updated successfully!')
      return location
    } catch (error) {
      notifications.error('Failed to update location')
      throw error
    }
  }

  async function deleteLocation(id: string) {
    locationsStore.setLoading(true)
    locationsStore.setError(null)

    try {
      await $fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      })

      markLocationsChanged()
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
    updateLocation,
    deleteLocation,
    setFilters: locationsStore.setFilters,
    clearFilters: locationsStore.clearFilters,
  }
}
