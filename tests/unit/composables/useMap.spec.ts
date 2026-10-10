import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '~/stores/map'

const importLibraryMock = vi.hoisted(() => vi.fn())
const setOptionsMock = vi.hoisted(() => vi.fn())
vi.mock('@googlemaps/js-api-loader', () => ({
  importLibrary: importLibraryMock,
  setOptions: setOptionsMock,
}))

const geocode = vi.fn()

// Minimal Map: center is a value-comparable stand-in for LatLng
const fakeMaps = vi.hoisted(() => {
  type Center = { lat: number; lng: number; equals: (o?: Center) => boolean }
  const latLng = (lat: number, lng: number): Center => ({
    lat,
    lng,
    equals: (o) => !!o && o.lat === lat && o.lng === lng,
  })
  const state = { map: null as null | { center: Center; panTo: ReturnType<typeof vi.fn> } }
  class FakeMap {
    center = latLng(12.9716, 77.5946)
    panTo = vi.fn()
    constructor() {
      state.map = this
    }
    getCenter() {
      return this.center
    }
    addListener = vi.fn()
  }
  return { FakeMap, latLng, state }
})

describe('useMap', () => {
  // The loader state is module-level, so load a fresh copy per test
  async function freshUseMap() {
    vi.resetModules()
    return (await import('~/composables/useMap')).useMap()
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('useMapStore', useMapStore)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { googleMapsApiKey: 'key' } }))
    vi.stubGlobal('google', undefined)
    importLibraryMock.mockReset().mockImplementation(async (name: string) => {
      if (name === 'maps') vi.stubGlobal('google', { maps: { Map: fakeMaps.FakeMap } })
      if (name === 'geocoding') {
        return {
          Geocoder: class {
            geocode = geocode
          },
        }
      }
      return {}
    })
    setOptionsMock.mockReset()
    geocode.mockReset()
  })

  it('loads only the maps library, once, for concurrent callers', async () => {
    const { loadGoogleMaps } = await freshUseMap()

    const [a, b] = await Promise.all([loadGoogleMaps(), loadGoogleMaps()])
    await loadGoogleMaps()

    expect(a).toBe(b)
    expect(importLibraryMock).toHaveBeenCalledTimes(1)
    expect(importLibraryMock).toHaveBeenCalledWith('maps')
    expect(setOptionsMock).toHaveBeenCalledTimes(1)
  })

  it('allows a retry after a failed load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { loadGoogleMaps } = await freshUseMap()
    importLibraryMock.mockRejectedValueOnce(new Error('network'))

    await expect(loadGoogleMaps()).rejects.toThrow('network')
    await expect(loadGoogleMaps()).resolves.toBeDefined()
  })

  describe('centerOnUserOnce', () => {
    const fix = { coords: { latitude: 1, longitude: 2 } }
    const position = { lat: 1, lng: 2 }
    let deliverFix: () => void
    let getCurrentPosition: ReturnType<typeof vi.fn>

    beforeEach(() => {
      getCurrentPosition = vi.fn((success) => {
        deliverFix = () => success(fix)
      })
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
      fakeMaps.state.map = null
    })

    it('requests one fix with the agreed options', async () => {
      const { centerOnUserOnce } = await freshUseMap()
      centerOnUserOnce({ isActive: () => true })

      expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
        timeout: 5000,
        maximumAge: 5 * 60 * 1000,
      })
    })

    it('does nothing without navigator.geolocation', async () => {
      vi.stubGlobal('navigator', {})
      const { centerOnUserOnce } = await freshUseMap()

      expect(() => centerOnUserOnce({ isActive: () => true })).not.toThrow()
    })

    it('pans and sets the store center when the map has not moved', async () => {
      const { centerOnUserOnce, initializeMap, mapStore } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      centerOnUserOnce({ isActive: () => true })

      deliverFix()

      expect(fakeMaps.state.map!.panTo).toHaveBeenCalledWith(position)
      expect(mapStore.center).toEqual(position)
    })

    it('does not pan when the map center changed before the fix arrived', async () => {
      const { centerOnUserOnce, initializeMap, mapStore } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      centerOnUserOnce({ isActive: () => true })
      // e.g. a search pick panned the map
      fakeMaps.state.map!.center = fakeMaps.latLng(40, -70)
      const centerBefore = mapStore.center

      deliverFix()

      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
      expect(mapStore.center).toEqual(centerBefore)
    })

    it('does nothing when the page is no longer active', async () => {
      let active = true
      const { centerOnUserOnce, initializeMap, mapStore } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      centerOnUserOnce({ isActive: () => active })
      active = false

      deliverFix()

      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
      expect(mapStore.center).toBeNull()
    })

    it('only sets the store center when the fix arrives before the map exists', async () => {
      const { centerOnUserOnce, initializeMap, mapStore } = await freshUseMap()
      centerOnUserOnce({ isActive: () => true })

      deliverFix()

      expect(fakeMaps.state.map).toBeNull()
      expect(mapStore.center).toEqual(position)

      await initializeMap(document.createElement('div'))
      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
    })

    it('ignores geolocation errors', async () => {
      getCurrentPosition.mockImplementation((_ok, fail) => fail({ code: 1 }))
      const { centerOnUserOnce } = await freshUseMap()

      expect(() => centerOnUserOnce({ isActive: () => true })).not.toThrow()
    })
  })

  it('geocodes via the lazily imported geocoding library', async () => {
    const { geocodeAddress, reverseGeocode } = await freshUseMap()
    geocode
      .mockImplementationOnce((_req, cb) =>
        cb([{ geometry: { location: { lat: () => 1, lng: () => 2 } } }], 'OK')
      )
      .mockImplementationOnce((_req, cb) => cb([{ formatted_address: '1 Main St' }], 'OK'))

    await expect(geocodeAddress('x')).resolves.toEqual({ lat: 1, lng: 2 })
    await expect(reverseGeocode(1, 2)).resolves.toBe('1 Main St')
    expect(importLibraryMock).toHaveBeenCalledWith('geocoding')
    expect(importLibraryMock).not.toHaveBeenCalledWith('places')
  })

  it('returns null when geocoding fails', async () => {
    const { geocodeAddress, reverseGeocode } = await freshUseMap()
    geocode.mockImplementation((_req, cb) => cb([], 'ZERO_RESULTS'))

    await expect(geocodeAddress('x')).resolves.toBeNull()
    await expect(reverseGeocode(1, 2)).resolves.toBeNull()
  })

  it('prefetchPlaces imports places after maps and swallows errors', async () => {
    const { prefetchPlaces } = await freshUseMap()

    prefetchPlaces()
    await vi.waitFor(() => expect(importLibraryMock).toHaveBeenCalledWith('places'))
    expect(importLibraryMock.mock.calls.map(([name]) => name)).toEqual(['maps', 'places'])

    importLibraryMock.mockRejectedValue(new Error('offline'))
    expect(() => prefetchPlaces()).not.toThrow()
    await Promise.resolve()
  })
})
