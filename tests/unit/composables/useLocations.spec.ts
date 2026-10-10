import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useLocationsStore } from '~/stores/locations'
import { useNotificationsStore } from '~/stores/notifications'
import { LOCATIONS_UNAVAILABLE_MESSAGE, useLocations } from '~/composables/useLocations'

const fetchMock = vi.fn()

describe('useLocations.fetchLocations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useLocationsStore', useLocationsStore)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
  })

  it('stores fetched locations', async () => {
    fetchMock.mockResolvedValue([{ id: '1' }])
    const { fetchLocations, locations, error } = useLocations()

    await fetchLocations()

    expect(locations.value).toHaveLength(1)
    expect(error.value).toBeNull()
  })

  it('shows an unavailable state without a toast on 503', async () => {
    fetchMock.mockRejectedValue({ statusCode: 503 })
    const { fetchLocations, locations, error } = useLocations()

    await expect(fetchLocations()).rejects.toBeDefined()

    expect(locations.value).toEqual([])
    expect(error.value).toBe(LOCATIONS_UNAVAILABLE_MESSAGE)
    expect(useNotificationsStore().notifications).toHaveLength(0)
  })

  it('notifies on other errors', async () => {
    fetchMock.mockRejectedValue({ statusCode: 500 })
    const { fetchLocations, error } = useLocations()

    await expect(fetchLocations()).rejects.toBeDefined()

    expect(error.value).toBe('Failed to fetch locations')
    expect(useNotificationsStore().notifications).toHaveLength(1)
  })

  it('fetches a single location', async () => {
    fetchMock.mockResolvedValue({ id: '1' })
    const { fetchLocation, selectedLocation } = useLocations()

    await fetchLocation('1')

    expect(selectedLocation.value).toEqual({ id: '1' })
    expect(fetchMock).toHaveBeenCalledWith('/api/locations/1')
  })

  it('creates and deletes a location with notifications', async () => {
    const { createLocation, deleteLocation, locations } = useLocations()

    fetchMock.mockResolvedValueOnce({ id: '1' })
    await createLocation({} as never)
    expect(locations.value).toHaveLength(1)

    fetchMock.mockResolvedValueOnce(undefined)
    await deleteLocation('1')
    expect(locations.value).toHaveLength(0)
    expect(useNotificationsStore().notifications).toHaveLength(2)
  })

  it('sets error and notifies when single fetch, create or delete fails', async () => {
    fetchMock.mockRejectedValue(new Error('x'))
    const { fetchLocation, createLocation, deleteLocation, error } = useLocations()

    await expect(fetchLocation('1')).rejects.toBeDefined()
    expect(error.value).toBe('Failed to fetch location')
    await expect(createLocation({} as never)).rejects.toBeDefined()
    expect(error.value).toBe('Failed to create location')
    await expect(deleteLocation('1')).rejects.toBeDefined()
    expect(error.value).toBe('Failed to delete location')
  })

  it('builds the query string from filters', async () => {
    fetchMock.mockResolvedValue([])
    const { fetchLocations } = useLocations()

    await fetchLocations({
      type: 'PARK',
      search: 'a',
      latitude: 1,
      longitude: 2,
      radiusKm: 3,
    } as never)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/locations?type=PARK&search=a&latitude=1&longitude=2&radiusKm=3'
    )
  })
})
