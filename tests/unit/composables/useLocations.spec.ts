import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useLocationsStore } from '~/stores/locations'
import { useNotificationsStore } from '~/stores/notifications'
import { LOCATIONS_UNAVAILABLE_MESSAGE, useLocations } from '~/composables/useLocations'

const fetchMock = vi.fn()
// Spy on the real implementation so the bypass behaviour is still exercised end to end
const markChanged = vi.hoisted(() => vi.fn())
vi.mock('~/utils/locations-cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/locations-cache')>()
  markChanged.mockImplementation(actual.markLocationsChanged)
  return { ...actual, markLocationsChanged: markChanged }
})
// Each test starts an hour later so the module-level CDN bypass window never leaks between tests
let testClock = 0

describe('useLocations.fetchLocations', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z').getTime() + testClock++ * 3_600_000)
    setActivePinia(createPinia())
    fetchMock.mockReset()
    markChanged.mockClear()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useLocationsStore', useLocationsStore)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
  })

  afterEach(() => {
    vi.useRealTimers()
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
    expect(markChanged).toHaveBeenCalledTimes(2)
  })

  it('updateLocation PATCHes, updates the store and marks locations changed', async () => {
    const store = useLocationsStore()
    store.setLocations([{ id: '1', type: 'PARK' } as never])
    store.setSelectedLocation({ id: '1', type: 'PARK' } as never)
    fetchMock.mockResolvedValueOnce({ id: '1', type: 'CAFE' })
    const { updateLocation, locations, selectedLocation, loading } = useLocations()

    await expect(updateLocation('1', { type: 'CAFE' as never })).resolves.toEqual({
      id: '1',
      type: 'CAFE',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/locations/1', {
      method: 'PATCH',
      body: { type: 'CAFE' },
    })
    expect(locations.value[0]).toMatchObject({ type: 'CAFE' })
    expect(selectedLocation.value).toMatchObject({ type: 'CAFE' })
    expect(markChanged).toHaveBeenCalledTimes(1)
    expect(loading.value).toBe(false)
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'success' })
  })

  it('updateLocation leaves an unrelated selected location alone', async () => {
    const store = useLocationsStore()
    store.setSelectedLocation({ id: '2', type: 'PARK' } as never)
    fetchMock.mockResolvedValueOnce({ id: '1', type: 'CAFE' })

    await useLocations().updateLocation('1', { type: 'CAFE' as never })

    expect(store.selectedLocation).toMatchObject({ id: '2', type: 'PARK' })
  })

  it('updateLocation only toasts on failure (page error/loading untouched) and skips markLocationsChanged', async () => {
    fetchMock.mockRejectedValue(new Error('x'))
    const { updateLocation, error, loading } = useLocations()

    await expect(updateLocation('1', { leashRequired: true })).rejects.toBeDefined()

    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(markChanged).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error' })
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

  describe('CDN cache bypass after writes', () => {
    const url = () => fetchMock.mock.calls.at(-1)?.[0] as string
    type Api = ReturnType<typeof useLocations>

    it('does not add a fresh param by default', async () => {
      fetchMock.mockResolvedValue([])
      await useLocations().fetchLocations()
      expect(url()).toBe('/api/locations?')
    })

    it.each([
      ['createLocation', (l: Api) => l.createLocation({} as never)],
      ['deleteLocation', (l: Api) => l.deleteLocation('1')],
    ])('adds fresh=<now> for 90s after %s, then stops', async (_name, write) => {
      const locs = useLocations()
      fetchMock.mockResolvedValue({ id: '1' })
      await write(locs)

      fetchMock.mockResolvedValue([])
      await locs.fetchLocations({ type: 'PARK' } as never)
      expect(url()).toBe(`/api/locations?type=PARK&fresh=${Date.now()}`)

      vi.setSystemTime(Date.now() + 89_000)
      await locs.fetchLocations()
      expect(url()).toBe(`/api/locations?fresh=${Date.now()}`)

      vi.setSystemTime(Date.now() + 2_000)
      await locs.fetchLocations()
      expect(url()).toBe('/api/locations?')
    })

    it('does not open the window when the write fails', async () => {
      const locs = useLocations()
      fetchMock.mockRejectedValue(new Error('x'))
      await expect(locs.createLocation({} as never)).rejects.toBeDefined()
      expect(markChanged).not.toHaveBeenCalled()

      fetchMock.mockResolvedValue([])
      await locs.fetchLocations()
      expect(url()).toBe('/api/locations?')
    })
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
