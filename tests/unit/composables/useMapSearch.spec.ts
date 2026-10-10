import { computed, defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocationType, type GooglePlaceDetails, type Location } from '~/types'
import type { SearchResultItem } from '~/utils/map-search'
import { useMapSearch } from '~/composables/useMapSearch'
import { createMockLocation } from '../../fixtures/factories'

const mocks = vi.hoisted(() => ({
  fetchLocations: vi.fn(),
  createMarker: vi.fn(),
  fetchSuggestions: vi.fn(),
  selectSuggestion: vi.fn(),
  getPlaceDetails: vi.fn(),
  resetSession: vi.fn(),
  notifyError: vi.fn(),
}))

const savedLocations = ref<Location[]>([])

vi.mock('~/composables/useLocations', () => ({
  useLocations: () => ({
    fetchLocations: mocks.fetchLocations,
    locations: computed(() => savedLocations.value),
  }),
}))
vi.mock('~/composables/useMap', () => ({
  useMap: () => ({ createMarker: mocks.createMarker }),
}))
vi.mock('~/composables/usePlacesSearch', () => ({
  usePlacesSearch: () => ({
    placesUnavailable: ref(false),
    fetchSuggestions: mocks.fetchSuggestions,
    selectSuggestion: mocks.selectSuggestion,
    getPlaceDetails: mocks.getPlaceDetails,
    resetSession: mocks.resetSession,
  }),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const googleDetails: GooglePlaceDetails = {
  placeId: 'g1',
  name: 'Google Cafe',
  address: 'Road 1',
  latitude: 1,
  longitude: 2,
  types: ['cafe'],
}

const googleItem: SearchResultItem = {
  kind: 'google',
  key: 'google:g1',
  label: 'Google Cafe',
  description: '',
  suggestion: { placeId: 'g1', mainText: 'Google Cafe', secondaryText: '' },
}

function setup() {
  const map = {
    panTo: vi.fn(),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
  }
  const selectedType = ref<LocationType | null>(null)
  const onLocationsUpdated = vi.fn()
  let search!: ReturnType<typeof useMapSearch>
  const wrapper = mount(
    defineComponent({
      setup() {
        search = useMapSearch({
          getMap: () => map as unknown as google.maps.Map,
          selectedType,
          onLocationsUpdated,
        })
        return () => null
      },
    })
  )
  return { search, map, selectedType, onLocationsUpdated, wrapper }
}

describe('useMapSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('useNotificationsStore', () => ({ error: mocks.notifyError }))
    vi.stubGlobal('google', {
      maps: { Size: vi.fn(), Point: vi.fn() },
    })
    savedLocations.value = []
    Object.values(mocks).forEach((m) => m.mockReset())
    mocks.fetchLocations.mockResolvedValue([])
    mocks.fetchSuggestions.mockResolvedValue([])
    mocks.createMarker.mockImplementation(() => ({ setMap: vi.fn() }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('searching', () => {
    it('debounces typing, then loads saved places and suggestions', async () => {
      savedLocations.value = [createMockLocation({ id: 'a', name: 'Cubbon' })]
      mocks.fetchSuggestions.mockResolvedValue([
        { placeId: 'g1', mainText: 'Google Cafe', secondaryText: '' },
      ])
      const { search, onLocationsUpdated } = setup()

      search.query.value = 'cu'
      search.query.value = 'cub'
      await nextTick()
      expect(mocks.fetchLocations).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(300)

      expect(mocks.fetchLocations).toHaveBeenCalledTimes(1)
      expect(mocks.fetchLocations).toHaveBeenCalledWith({ type: undefined, search: 'cub' })
      expect(mocks.fetchSuggestions).toHaveBeenCalledWith('cub')
      expect(onLocationsUpdated).toHaveBeenCalledTimes(1)
      expect(search.loading.value).toBe(false)
      expect(search.model.value.groups.map((g) => g.title)).toEqual(['Saved places', 'Google Maps'])
    })

    it('passes the selected type filter', async () => {
      const { search, selectedType } = setup()
      selectedType.value = LocationType.CAFE

      search.query.value = 'bar'
      await vi.advanceTimersByTimeAsync(300)

      expect(mocks.fetchLocations).toHaveBeenCalledWith({ type: LocationType.CAFE, search: 'bar' })
    })

    it('clears results immediately and restores the listing for short queries', async () => {
      savedLocations.value = [createMockLocation()]
      const { search } = setup()
      search.query.value = 'cub'
      await vi.advanceTimersByTimeAsync(300)
      expect(search.model.value.flat.length).toBeGreaterThan(0)

      search.query.value = 'c'
      await nextTick()
      expect(search.model.value.flat).toEqual([])

      mocks.fetchLocations.mockClear()
      await vi.advanceTimersByTimeAsync(300)
      expect(mocks.fetchLocations).toHaveBeenCalledWith({ type: undefined, search: undefined })
      expect(mocks.fetchSuggestions).toHaveBeenCalledTimes(1)
      expect(mocks.resetSession).toHaveBeenCalled()
    })

    it('does not redraw markers or commit suggestions for a superseded run', async () => {
      const olderSuggestions = deferred<unknown[]>()
      const olderLocations = deferred<unknown[] | null>()
      mocks.fetchSuggestions
        .mockReturnValueOnce(olderSuggestions.promise)
        .mockResolvedValueOnce([{ placeId: 'new', mainText: 'New', secondaryText: '' }])
      mocks.fetchLocations
        .mockReturnValueOnce(olderLocations.promise)
        .mockResolvedValueOnce([createMockLocation()])
      const { search, onLocationsUpdated } = setup()

      search.query.value = 'ol'
      await vi.advanceTimersByTimeAsync(300)
      search.query.value = 'new'
      await vi.advanceTimersByTimeAsync(300)
      expect(onLocationsUpdated).toHaveBeenCalledTimes(1)

      // The older request was superseded, so useLocations resolves it with null
      olderLocations.resolve(null)
      olderSuggestions.resolve([{ placeId: 'old', mainText: 'Old', secondaryText: '' }])
      await vi.advanceTimersByTimeAsync(0)

      expect(onLocationsUpdated).toHaveBeenCalledTimes(1)
      expect(search.model.value.flat.map((i) => i.key)).toEqual(['google:new'])
      expect(search.loading.value).toBe(false)
    })

    it('still redraws when the latest request fails', async () => {
      mocks.fetchLocations.mockRejectedValue({ statusCode: 503 })
      const { search, onLocationsUpdated } = setup()

      await search.refreshLocations()

      expect(onLocationsUpdated).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('category filter', () => {
    it('re-runs the search and refreshes markers when the type changes', async () => {
      const { selectedType, onLocationsUpdated } = setup()

      selectedType.value = LocationType.CAFE
      await nextTick()
      await vi.advanceTimersByTimeAsync(0)

      expect(mocks.fetchLocations).toHaveBeenCalledWith({
        type: LocationType.CAFE,
        search: undefined,
      })
      expect(onLocationsUpdated).toHaveBeenCalledTimes(1)
    })
  })

  describe('select', () => {
    it('opens a saved place and recentres the map', async () => {
      const { search, map } = setup()
      const location = createMockLocation({ id: 'a', googlePlaceId: 'gp' })

      await search.select({
        kind: 'saved',
        key: 'saved:a',
        label: location.name,
        description: '',
        locationType: location.type,
        location,
      })

      expect(search.selectedSavedLocation.value).toEqual(location)
      expect(search.selectedPlace.value).toMatchObject({ placeId: 'gp', name: location.name })
      expect(map.panTo).toHaveBeenCalledWith({ lat: location.latitude, lng: location.longitude })
      expect(map.setZoom).toHaveBeenCalledWith(16)
      expect(mocks.selectSuggestion).not.toHaveBeenCalled()
    })

    it('opens a Google result, fits the viewport and drops a pin', async () => {
      const viewport = { id: 'vp' }
      mocks.selectSuggestion.mockResolvedValue({ details: googleDetails, viewport })
      const { search, map } = setup()

      await search.select(googleItem)

      expect(search.selectedPlace.value).toEqual(googleDetails)
      expect(search.selectedSavedLocation.value).toBeNull()
      expect(search.placeDetailsLoading.value).toBe(false)
      expect(map.fitBounds).toHaveBeenCalledWith(viewport)
      expect(mocks.createMarker).toHaveBeenCalledWith(
        expect.objectContaining({ position: { lat: 1, lng: 2 }, title: 'Google Cafe' })
      )
    })

    it('pans and zooms when the place has no viewport', async () => {
      mocks.selectSuggestion.mockResolvedValue({ details: googleDetails, viewport: null })
      const { search, map } = setup()

      await search.select(googleItem)

      expect(map.fitBounds).not.toHaveBeenCalled()
      expect(map.panTo).toHaveBeenCalledWith({ lat: 1, lng: 2 })
      expect(map.setZoom).toHaveBeenCalledWith(16)
    })

    it('replaces the previous search pin and clears it on dismiss', async () => {
      const pins = [{ setMap: vi.fn() }, { setMap: vi.fn() }]
      mocks.createMarker.mockReturnValueOnce(pins[0]).mockReturnValueOnce(pins[1])
      mocks.selectSuggestion.mockResolvedValue({ details: googleDetails, viewport: null })
      const { search } = setup()

      await search.select(googleItem)
      await search.select(googleItem)
      expect(pins[0]!.setMap).toHaveBeenCalledWith(null)
      expect(pins[1]!.setMap).not.toHaveBeenCalled()

      search.dismiss()
      expect(pins[1]!.setMap).toHaveBeenCalledWith(null)
      expect(search.selectedPlace.value).toBeNull()
    })

    it('removes the pin when a saved place is chosen afterwards', async () => {
      const pin = { setMap: vi.fn() }
      mocks.createMarker.mockReturnValue(pin)
      mocks.selectSuggestion.mockResolvedValue({ details: googleDetails, viewport: null })
      const { search } = setup()
      await search.select(googleItem)

      const location = createMockLocation()
      await search.select({
        kind: 'saved',
        key: 'saved:x',
        label: '',
        description: '',
        locationType: location.type,
        location,
      })

      expect(pin.setMap).toHaveBeenCalledWith(null)
    })

    it('notifies, and leaves no stale card, when the Google lookup fails', async () => {
      mocks.selectSuggestion.mockResolvedValue(null)
      const { search } = setup()
      search.selectedPlace.value = googleDetails
      search.selectedSavedLocation.value = createMockLocation()

      await search.select(googleItem)

      expect(mocks.notifyError).toHaveBeenCalledWith('Could not load details for that place')
      expect(search.selectedPlace.value).toBeNull()
      expect(search.selectedSavedLocation.value).toBeNull()
      expect(search.placeDetailsLoading.value).toBe(false)
      expect(mocks.createMarker).not.toHaveBeenCalled()
    })

    it('ignores a Google result that finishes after the selection was dismissed', async () => {
      const pending = deferred<unknown>()
      mocks.selectSuggestion.mockReturnValue(pending.promise)
      const { search } = setup()

      const selecting = search.select(googleItem)
      expect(search.placeDetailsLoading.value).toBe(true)
      search.dismiss()
      pending.resolve({ details: googleDetails, viewport: null })
      await selecting

      expect(search.selectedPlace.value).toBeNull()
      expect(mocks.createMarker).not.toHaveBeenCalled()
    })

    it('does nothing without a map', async () => {
      let search!: ReturnType<typeof useMapSearch>
      mount(
        defineComponent({
          setup() {
            search = useMapSearch({
              getMap: () => null,
              selectedType: ref(null),
              onLocationsUpdated: vi.fn(),
            })
            return () => null
          },
        })
      )

      await search.select(googleItem)

      expect(mocks.selectSuggestion).not.toHaveBeenCalled()
    })
  })

  it('clears the pin and the places session on unmount', async () => {
    const pin = { setMap: vi.fn() }
    mocks.createMarker.mockReturnValue(pin)
    mocks.selectSuggestion.mockResolvedValue({ details: googleDetails, viewport: null })
    const { search, wrapper } = setup()
    await search.select(googleItem)

    wrapper.unmount()

    expect(pin.setMap).toHaveBeenCalledWith(null)
    expect(mocks.resetSession).toHaveBeenCalled()
  })
})

describe('useMapSearch selectPlaceId', () => {
  const poiA: GooglePlaceDetails = { ...googleDetails, placeId: 'a', name: 'POI A' }
  const poiB: GooglePlaceDetails = { ...googleDetails, placeId: 'b', name: 'POI B' }

  beforeEach(() => {
    vi.stubGlobal('useNotificationsStore', () => ({ error: mocks.notifyError }))
    vi.stubGlobal('google', { maps: { Size: vi.fn(), Point: vi.fn() } })
    savedLocations.value = []
    Object.values(mocks).forEach((m) => m.mockReset())
    mocks.fetchLocations.mockResolvedValue([])
    mocks.fetchSuggestions.mockResolvedValue([])
    mocks.createMarker.mockImplementation(() => ({ setMap: vi.fn() }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows the place, pans to the click position and creates no pin', async () => {
    mocks.getPlaceDetails.mockResolvedValue(googleDetails)
    const { search, map } = setup()
    const position = { lat: 5, lng: 6 }

    const pending = search.selectPlaceId('g1', position)
    expect(search.placeDetailsLoading.value).toBe(true)
    await pending

    expect(mocks.getPlaceDetails).toHaveBeenCalledWith('g1')
    expect(search.selectedPlace.value).toEqual(googleDetails)
    expect(search.placeDetailsLoading.value).toBe(false)
    expect(map.panTo).toHaveBeenCalledWith(position)
    expect(mocks.createMarker).not.toHaveBeenCalled()
  })

  it('falls back to the place coordinates when no position is given', async () => {
    mocks.getPlaceDetails.mockResolvedValue(googleDetails)
    const { search, map } = setup()

    await search.selectPlaceId('g1')

    expect(map.panTo).toHaveBeenCalledWith({ lat: 1, lng: 2 })
  })

  it('notifies and shows no card when details are unavailable', async () => {
    mocks.getPlaceDetails.mockResolvedValue(null)
    const { search, map } = setup()

    await search.selectPlaceId('g1', { lat: 5, lng: 6 })

    expect(mocks.notifyError).toHaveBeenCalledWith('Could not load details for that place')
    expect(search.selectedPlace.value).toBeNull()
    expect(search.placeDetailsLoading.value).toBe(false)
    expect(map.panTo).not.toHaveBeenCalled()
  })

  it('does nothing without a map', async () => {
    let search!: ReturnType<typeof useMapSearch>
    mount(
      defineComponent({
        setup() {
          search = useMapSearch({
            getMap: () => null,
            selectedType: ref(null),
            onLocationsUpdated: vi.fn(),
          })
          return () => null
        },
      })
    )

    await search.selectPlaceId('g1')

    expect(mocks.getPlaceDetails).not.toHaveBeenCalled()
  })

  it('ignores a superseded click that resolves last', async () => {
    const a = deferred<GooglePlaceDetails | null>()
    const b = deferred<GooglePlaceDetails | null>()
    mocks.getPlaceDetails.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const { search, map } = setup()

    const first = search.selectPlaceId('a', { lat: 1, lng: 1 })
    const second = search.selectPlaceId('b', { lat: 2, lng: 2 })

    b.resolve(poiB)
    await second
    expect(search.selectedPlace.value).toEqual(poiB)
    expect(search.placeDetailsLoading.value).toBe(false)

    // A resolves last and must not touch anything
    a.resolve(null)
    await first
    expect(search.selectedPlace.value).toEqual(poiB)
    expect(mocks.notifyError).not.toHaveBeenCalled()
    expect(map.panTo).toHaveBeenCalledTimes(1)
    expect(map.panTo).toHaveBeenCalledWith({ lat: 2, lng: 2 })
  })

  it('keeps the loading flag for the newer click when the older one resolves first', async () => {
    const a = deferred<GooglePlaceDetails | null>()
    const b = deferred<GooglePlaceDetails | null>()
    mocks.getPlaceDetails.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const { search } = setup()

    const first = search.selectPlaceId('a')
    const second = search.selectPlaceId('b')

    a.resolve(poiA)
    await first
    expect(search.placeDetailsLoading.value).toBe(true)
    expect(search.selectedPlace.value).toBeNull()

    b.resolve(poiB)
    await second
    expect(search.selectedPlace.value).toEqual(poiB)
    expect(search.placeDetailsLoading.value).toBe(false)
  })

  it('is superseded by a search-result selection', async () => {
    const a = deferred<GooglePlaceDetails | null>()
    mocks.getPlaceDetails.mockReturnValue(a.promise)
    const { search } = setup()
    const location = createMockLocation({ id: 's' })

    const click = search.selectPlaceId('a')
    await search.select({
      kind: 'saved',
      key: 'saved:s',
      label: location.name,
      description: '',
      locationType: location.type,
      location,
    })
    a.resolve(poiA)
    await click

    expect(search.selectedSavedLocation.value).toEqual(location)
    expect(search.selectedPlace.value).toMatchObject({ name: location.name })
    expect(mocks.notifyError).not.toHaveBeenCalled()
  })

  it('ignores a click that resolves after dismiss', async () => {
    const a = deferred<GooglePlaceDetails | null>()
    mocks.getPlaceDetails.mockReturnValue(a.promise)
    const { search, map } = setup()

    const click = search.selectPlaceId('a')
    search.dismiss()
    expect(search.placeDetailsLoading.value).toBe(false)
    a.resolve(poiA)
    await click

    expect(search.selectedPlace.value).toBeNull()
    expect(map.panTo).not.toHaveBeenCalled()
    expect(mocks.notifyError).not.toHaveBeenCalled()
  })
})
