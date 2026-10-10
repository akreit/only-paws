import { isProxy, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '~/stores/map'
import { usePlacesSearch } from '~/composables/usePlacesSearch'

const importLibraryMock = vi.hoisted(() => vi.fn())
vi.mock('@googlemaps/js-api-loader', () => ({
  importLibrary: importLibraryMock,
  setOptions: vi.fn(),
}))

const FakeToken = vi.fn()
const fetchAutocompleteSuggestions = vi.fn()
const fetchFields = vi.fn()
const placeCtor = vi.fn()

function prediction(placeId: string, main = `Main ${placeId}`, secondary = 'Town') {
  const place = {
    id: placeId,
    displayName: `Name ${placeId}`,
    formattedAddress: 'Addr',
    location: { lat: () => 10, lng: () => 20 },
    viewport: { id: 'viewport' },
    types: ['park'],
    fetchFields,
  }
  return {
    placePrediction: {
      placeId,
      mainText: { text: main },
      secondaryText: { text: secondary },
      text: { text: `${main}, ${secondary}` },
      toPlace: vi.fn(() => place),
    },
    place,
  }
}

describe('usePlacesSearch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('useMapStore', useMapStore)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchAutocompleteSuggestions.mockReset()
    fetchFields.mockReset().mockResolvedValue(undefined)
    placeCtor.mockReset()
    importLibraryMock.mockReset().mockResolvedValue({
      AutocompleteSuggestion: { fetchAutocompleteSuggestions },
      AutocompleteSessionToken: FakeToken,
      Place: function (opts: unknown) {
        placeCtor(opts)
        return { fetchFields, id: 'fresh', location: { lat: () => 1, lng: () => 2 } }
      },
    })
  })

  it('maps suggestions to plain data and skips non-place suggestions', async () => {
    const p = prediction('p1')
    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [{ placePrediction: p.placePrediction }, { placePrediction: null }],
    })
    const { fetchSuggestions, placesUnavailable, searching } = usePlacesSearch()

    const result = await fetchSuggestions('par')

    expect(result).toEqual([{ placeId: 'p1', mainText: 'Main p1', secondaryText: 'Town' }])
    expect(placesUnavailable.value).toBe(false)
    expect(searching.value).toBe(false)
  })

  it('falls back to full text when main/secondary text are missing', async () => {
    const p = prediction('p1')
    ;(p.placePrediction as Record<string, unknown>).mainText = null
    ;(p.placePrediction as Record<string, unknown>).secondaryText = null
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [p] })
    const { fetchSuggestions } = usePlacesSearch()

    expect(await fetchSuggestions('par')).toEqual([
      { placeId: 'p1', mainText: 'Main p1, Town', secondaryText: '' },
    ])
  })

  it('reuses one session token until a selection resets it', async () => {
    const p = prediction('p1')
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [p] })
    const { fetchSuggestions, selectSuggestion } = usePlacesSearch()

    const [first] = await fetchSuggestions('pa')
    await fetchSuggestions('par')
    const tokens = fetchAutocompleteSuggestions.mock.calls.map(([req]) => req.sessionToken)
    expect(tokens[0]).toBeInstanceOf(FakeToken)
    expect(tokens[1]).toBe(tokens[0])

    await selectSuggestion(first!)
    await fetchSuggestions('park')
    const next = fetchAutocompleteSuggestions.mock.calls[2]![0].sessionToken
    expect(next).toBeInstanceOf(FakeToken)
    expect(next).not.toBe(tokens[0])
  })

  it('resetSession starts a new token', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
    const { fetchSuggestions, resetSession } = usePlacesSearch()

    await fetchSuggestions('ab')
    resetSession()
    await fetchSuggestions('abc')

    const [a, b] = fetchAutocompleteSuggestions.mock.calls.map(([req]) => req.sessionToken)
    expect(a).not.toBe(b)
  })

  it('biases toward the current map bounds', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
    const bounds = { id: 'bounds' } as unknown as google.maps.LatLngBounds
    useMapStore().setBounds(bounds)
    useMapStore().setCenter({ lat: 1, lng: 2 })

    await usePlacesSearch().fetchSuggestions('ab')

    expect(fetchAutocompleteSuggestions.mock.calls[0]![0].locationBias).toEqual(bounds)
  })

  it('passes LatLngBounds to Google as a plain literal, not the store proxy', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
    const literal = { north: 13, south: 12, east: 78, west: 77 }
    const bounds = { toJSON: () => literal } as unknown as google.maps.LatLngBounds
    useMapStore().setBounds(bounds)

    await usePlacesSearch().fetchSuggestions('ab')

    const bias = fetchAutocompleteSuggestions.mock.calls[0]![0].locationBias
    expect(bias).toEqual(literal)
    expect(isProxy(bias)).toBe(false)
  })

  it('uses the map instance bounds, then a center circle, then no bias', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
    const store = useMapStore()
    const { fetchSuggestions } = usePlacesSearch()

    const instanceBounds = { id: 'inst' }
    store.setMapInstance({ getBounds: () => instanceBounds } as unknown as google.maps.Map)
    await fetchSuggestions('ab')
    expect(fetchAutocompleteSuggestions.mock.calls[0]![0].locationBias).toEqual(instanceBounds)

    store.setMapInstance({ getBounds: () => undefined } as unknown as google.maps.Map)
    store.setCenter({ lat: 5, lng: 6 })
    await fetchSuggestions('ab')
    expect(fetchAutocompleteSuggestions.mock.calls[1]![0].locationBias).toEqual({
      center: { lat: 5, lng: 6 },
      radius: 20000,
    })

    store.setMapInstance(null)
    useMapStore().$patch({ center: null })
    await fetchSuggestions('ab')
    expect(fetchAutocompleteSuggestions.mock.calls[2]![0].locationBias).toBeUndefined()
  })

  it('returns [] and flags unavailable when the request fails, then recovers', async () => {
    fetchAutocompleteSuggestions.mockRejectedValueOnce(new Error('API not enabled'))
    const { fetchSuggestions, placesUnavailable } = usePlacesSearch()

    expect(await fetchSuggestions('ab')).toEqual([])
    expect(placesUnavailable.value).toBe(true)

    fetchAutocompleteSuggestions.mockResolvedValueOnce({ suggestions: [] })
    await fetchSuggestions('abc')
    expect(placesUnavailable.value).toBe(false)
  })

  it('returns [] and flags unavailable when the library fails to load', async () => {
    importLibraryMock.mockRejectedValue(new Error('load failed'))
    const { fetchSuggestions, placesUnavailable, searching } = usePlacesSearch()

    expect(await fetchSuggestions('ab')).toEqual([])
    expect(placesUnavailable.value).toBe(true)
    expect(searching.value).toBe(false)
  })

  it('fetches the required fields on selection and maps the place', async () => {
    const p = prediction('p1')
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [p] })
    const { fetchSuggestions, selectSuggestion } = usePlacesSearch()
    const [s] = await fetchSuggestions('par')

    const result = await selectSuggestion(s!)

    expect(fetchFields).toHaveBeenCalledWith({
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport', 'types'],
    })
    expect(result?.details).toMatchObject({
      placeId: 'p1',
      name: 'Name p1',
      address: 'Addr',
      latitude: 10,
      longitude: 20,
      types: ['park'],
    })
    expect(result?.viewport).toEqual({ id: 'viewport' })
  })

  it('builds a Place from the id when no prediction is cached', async () => {
    const { selectSuggestion } = usePlacesSearch()

    const result = await selectSuggestion({ placeId: 'zzz', mainText: 'x', secondaryText: '' })

    expect(placeCtor).toHaveBeenCalledWith({ id: 'zzz' })
    expect(result?.details.placeId).toBe('fresh')
    expect(result?.viewport).toBeNull()
  })

  it('returns null when fetching fields fails', async () => {
    fetchFields.mockRejectedValue(new Error('denied'))
    const { selectSuggestion } = usePlacesSearch()

    expect(await selectSuggestion({ placeId: 'zzz', mainText: 'x', secondaryText: '' })).toBeNull()
  })
})
