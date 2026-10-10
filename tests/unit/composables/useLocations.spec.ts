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
      '/api/locations?type=PARK&search=a&latitude=1&longitude=2&radiusKm=3',
      { signal: expect.any(AbortSignal) }
    )
  })

  describe('overlapping requests', () => {
    function deferred<T>() {
      let resolve!: (value: T) => void
      let reject!: (reason: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }

    it('does not let an older response that resolves last overwrite the newer result', async () => {
      const older = deferred<unknown[]>()
      const newer = deferred<unknown[]>()
      fetchMock.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
      const { fetchLocations, locations, loading } = useLocations()

      const first = fetchLocations({ search: 'par' })
      const second = fetchLocations({ search: 'park' })

      newer.resolve([{ id: 'new' }])
      expect(await second).toEqual([{ id: 'new' }])
      older.resolve([{ id: 'old' }])
      expect(await first).toBeNull()

      expect(locations.value).toEqual([{ id: 'new' }])
      expect(loading.value).toBe(false)
    })

    it('aborts the previous request and ignores its failure', async () => {
      const older = deferred<unknown[]>()
      fetchMock.mockReturnValueOnce(older.promise).mockResolvedValueOnce([{ id: 'new' }])
      const { fetchLocations, locations, error } = useLocations()

      const first = fetchLocations()
      const firstSignal = fetchMock.mock.calls[0]![1].signal as AbortSignal
      await fetchLocations()
      expect(firstSignal.aborted).toBe(true)

      older.reject(new DOMException('aborted', 'AbortError'))
      expect(await first).toBeNull()

      expect(locations.value).toEqual([{ id: 'new' }])
      expect(error.value).toBeNull()
      expect(useNotificationsStore().notifications).toHaveLength(0)
    })

    it('keeps the loading flag on until the latest request settles', async () => {
      const older = deferred<unknown[]>()
      const newer = deferred<unknown[]>()
      fetchMock.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
      const { fetchLocations, loading } = useLocations()

      const first = fetchLocations()
      const second = fetchLocations()
      older.resolve([])
      await first
      expect(loading.value).toBe(true)

      newer.resolve([])
      await second
      expect(loading.value).toBe(false)
    })
  })
})
