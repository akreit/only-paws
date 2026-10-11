import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isProxy } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '~/stores/map'
import { useNotificationsStore } from '~/stores/notifications'
import { getLastPosition } from '~/utils/geolocation-preference'

const importLibraryMock = vi.hoisted(() => vi.fn())
const setOptionsMock = vi.hoisted(() => vi.fn())
vi.mock('@googlemaps/js-api-loader', () => ({
  importLibrary: importLibraryMock,
  setOptions: setOptionsMock,
}))

const geocode = vi.fn()

class FakeMap {
  options: { center: { lat: number; lng: number } }
  constructor(_el: unknown, options: { center: { lat: number; lng: number } }) {
    this.options = options
    created.push(this)
  }
  addListener = vi.fn()
}
const created: FakeMap[] = []
const lastMap = () => created.at(-1)!

describe('useMap', () => {
  // The loader state is module-level, so load a fresh copy per test
  async function freshUseMap() {
    vi.resetModules()
    return (await import('~/composables/useMap')).useMap()
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('useMapStore', useMapStore)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
    localStorage.clear()
    created.length = 0
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { googleMapsApiKey: 'key' } }))
    vi.stubGlobal('google', undefined)
    importLibraryMock.mockReset().mockImplementation(async (name: string) => {
      if (name === 'maps') vi.stubGlobal('google', { maps: { Map: FakeMap } })
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

  describe('preloadMap', () => {
    it('only warms the Maps script, once', async () => {
      const { preloadMap } = await freshUseMap()

      preloadMap()
      preloadMap()

      expect(importLibraryMock).toHaveBeenCalledTimes(1)
      expect(importLibraryMock).toHaveBeenCalledWith('maps')
    })

    it('never touches geolocation or permissions, nor saves a position', async () => {
      const getCurrentPosition = vi.fn()
      const query = vi.fn(async () => ({ state: 'granted' }))
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition }, permissions: { query } })
      const { preloadMap } = await freshUseMap()

      preloadMap()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(getCurrentPosition).not.toHaveBeenCalled()
      expect(query).not.toHaveBeenCalled()
      expect(getLastPosition()).toBeNull()
    })

    it('never throws when loading fails', async () => {
      importLibraryMock.mockRejectedValue(new Error('offline'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { preloadMap } = await freshUseMap()

      expect(() => preloadMap()).not.toThrow()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  })

  describe('initializeMap center', () => {
    const bangalore = { lat: 12.9716, lng: 77.5946 }

    it('prefers the store center over initialCenter', async () => {
      const { initializeMap, mapStore } = await freshUseMap()
      mapStore.setCenter({ lat: 5, lng: 6 })

      await initializeMap(document.createElement('div'), { initialCenter: { lat: 1, lng: 2 } })

      expect(lastMap().options.center).toEqual({ lat: 5, lng: 6 })
    })

    it('uses initialCenter, then falls back to Bangalore', async () => {
      const { initializeMap } = await freshUseMap()

      await initializeMap(document.createElement('div'), { initialCenter: { lat: 1, lng: 2 } })
      expect(lastMap().options.center).toEqual({ lat: 1, lng: 2 })

      await initializeMap(document.createElement('div'), { initialCenter: null })
      expect(lastMap().options.center).toEqual(bangalore)

      await initializeMap(document.createElement('div'))
      expect(lastMap().options.center).toEqual(bangalore)
    })

    it('stores the map instance raw (not a reactive proxy)', async () => {
      const { initializeMap, mapStore } = await freshUseMap()

      const map = await initializeMap(document.createElement('div'))

      expect(mapStore.mapInstance).toBe(map)
      expect(isProxy(mapStore.mapInstance)).toBe(false)
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
