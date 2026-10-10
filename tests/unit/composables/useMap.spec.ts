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
      if (name === 'maps') vi.stubGlobal('google', { maps: { Map: vi.fn() } })
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
