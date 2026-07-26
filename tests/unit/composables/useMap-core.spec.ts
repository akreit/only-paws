import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMap } from '~/composables/useMap'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn().mockResolvedValue({}),
}))

// Nuxt auto-imports are not available in vitest — stub them globally
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { googleMapsApiKey: 'test-key' },
}))

const mapStore = {
  center: null as { lat: number; lng: number } | null,
  zoom: 13,
  setCenter: vi.fn(),
  setZoom: vi.fn(),
  setBounds: vi.fn(),
  setMapInstance: vi.fn(),
}

vi.stubGlobal('useMapStore', () => mapStore)

class MapMock {
  listeners: Record<string, (() => void)[]> = {}
  options: unknown
  constructor(_element: HTMLElement, options: unknown) {
    this.options = options
  }
  addListener(event: string, cb: () => void) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(cb)
  }
  getCenter = vi.fn()
  getZoom = vi.fn()
  getBounds = vi.fn()
  trigger(event: string) {
    this.listeners[event]?.forEach((cb) => cb())
  }
}

describe('useMap – loadGoogleMaps', () => {
  it('calls setOptions and imports the required libraries on first load', async () => {
    const { loadGoogleMaps } = useMap()

    const result = await loadGoogleMaps()

    expect(setOptions).toHaveBeenCalledWith({ key: 'test-key' })
    expect(importLibrary).toHaveBeenCalledWith('places')
    expect(importLibrary).toHaveBeenCalledWith('geometry')
    expect(importLibrary).toHaveBeenCalledWith('maps')
    expect(result).toBe(window.google.maps)
  })

  it('returns the cached maps instance without re-fetching on subsequent calls', async () => {
    const { loadGoogleMaps } = useMap()
    vi.mocked(setOptions).mockClear()
    vi.mocked(importLibrary).mockClear()

    await loadGoogleMaps()

    expect(setOptions).not.toHaveBeenCalled()
    expect(importLibrary).not.toHaveBeenCalled()
  })

  it('logs and rethrows when a library import fails', async () => {
    const originalGoogle = window.google
    // Force the "not cached" branch even though isLoaded is already true.
    // @ts-expect-error simulate library not yet attached to window
    window.google = undefined

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('network failure')
    vi.mocked(importLibrary).mockRejectedValueOnce(error)

    const { loadGoogleMaps } = useMap()

    await expect(loadGoogleMaps()).rejects.toThrow('network failure')
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Maps] Failed to import libraries:', error)

    consoleErrorSpy.mockRestore()
    window.google = originalGoogle
  })
})

describe('useMap – initializeMap', () => {
  let mapMock: MapMock

  beforeEach(() => {
    mapStore.center = null
    mapStore.zoom = 13
    mapStore.setCenter.mockClear()
    mapStore.setZoom.mockClear()
    mapStore.setBounds.mockClear()
    mapStore.setMapInstance.mockClear()

    window.google = {
      ...window.google,
      maps: {
        ...window.google?.maps,
        Map: vi.fn(function (element: HTMLElement, options: unknown) {
          mapMock = new MapMock(element, options)
          return mapMock
        }) as unknown as typeof google.maps.Map,
      },
    } as typeof google
  })

  it('creates a map with the default center when the store has none', async () => {
    const element = document.createElement('div')
    const { initializeMap } = useMap()

    const map = await initializeMap(element)

    expect(mapMock.options).toMatchObject({
      center: { lat: 12.9716, lng: 77.5946 },
      zoom: 13,
    })
    expect(mapStore.setMapInstance).toHaveBeenCalledWith(map)
  })

  it('uses the store center when one is already set', async () => {
    mapStore.center = { lat: 1, lng: 2 }
    const element = document.createElement('div')
    const { initializeMap } = useMap()

    await initializeMap(element)

    expect(mapMock.options).toMatchObject({ center: { lat: 1, lng: 2 } })
  })

  it('updates the store when center_changed fires with a center', async () => {
    const element = document.createElement('div')
    const { initializeMap } = useMap()
    await initializeMap(element)

    mapMock.getCenter.mockReturnValue({ lat: () => 5, lng: () => 6 })
    mapMock.trigger('center_changed')

    expect(mapStore.setCenter).toHaveBeenCalledWith({ lat: 5, lng: 6 })
  })

  it('does not update the store when center_changed fires without a center', async () => {
    const element = document.createElement('div')
    const { initializeMap } = useMap()
    await initializeMap(element)

    mapMock.getCenter.mockReturnValue(null)
    mapMock.trigger('center_changed')

    expect(mapStore.setCenter).not.toHaveBeenCalled()
  })

  it('updates the store zoom when zoom_changed fires', async () => {
    const element = document.createElement('div')
    const { initializeMap } = useMap()
    await initializeMap(element)

    mapMock.getZoom.mockReturnValue(18)
    mapMock.trigger('zoom_changed')

    expect(mapStore.setZoom).toHaveBeenCalledWith(18)
  })

  it('falls back to the store zoom when getZoom returns falsy', async () => {
    const element = document.createElement('div')
    const { initializeMap } = useMap()
    await initializeMap(element)

    mapMock.getZoom.mockReturnValue(undefined)
    mapMock.trigger('zoom_changed')

    expect(mapStore.setZoom).toHaveBeenCalledWith(mapStore.zoom)
  })

  it('updates the store when bounds_changed fires with bounds', async () => {
    const element = document.createElement('div')
    const { initializeMap } = useMap()
    await initializeMap(element)

    const bounds = {} as google.maps.LatLngBounds
    mapMock.getBounds.mockReturnValue(bounds)
    mapMock.trigger('bounds_changed')

    expect(mapStore.setBounds).toHaveBeenCalledWith(bounds)
  })

  it('does not update the store when bounds_changed fires without bounds', async () => {
    const element = document.createElement('div')
    const { initializeMap } = useMap()
    await initializeMap(element)

    mapMock.getBounds.mockReturnValue(null)
    mapMock.trigger('bounds_changed')

    expect(mapStore.setBounds).not.toHaveBeenCalled()
  })
})

describe('useMap – createMarker', () => {
  class MarkerMock {
    listeners: Record<string, () => void> = {}
    constructor(public options: unknown) {}
    addListener(event: string, cb: () => void) {
      this.listeners[event] = cb
    }
  }

  let MarkerConstructor: ReturnType<typeof vi.fn>

  beforeEach(() => {
    MarkerConstructor = vi.fn(function (options: unknown) {
      return new MarkerMock(options)
    })
    window.google = {
      ...window.google,
      maps: {
        ...window.google?.maps,
        Marker: MarkerConstructor as unknown as typeof google.maps.Marker,
      },
    } as typeof google
  })

  it('creates a marker with the given options', () => {
    const { createMarker } = useMap()
    const map = {} as google.maps.Map

    const marker = createMarker({ map, position: { lat: 1, lng: 2 }, title: 'Spot' })

    expect(MarkerConstructor).toHaveBeenCalledWith({
      map,
      position: { lat: 1, lng: 2 },
      title: 'Spot',
      icon: undefined,
    })
    expect(marker).toBeDefined()
  })

  it('registers a click listener when onClick is provided', () => {
    const { createMarker } = useMap()
    const onClick = vi.fn()
    const map = {} as google.maps.Map

    const marker = createMarker({ map, position: { lat: 1, lng: 2 }, onClick }) as unknown as {
      listeners: Record<string, () => void>
    }

    marker.listeners['click']()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not register a click listener when onClick is omitted', () => {
    const { createMarker } = useMap()
    const map = {} as google.maps.Map

    const marker = createMarker({ map, position: { lat: 1, lng: 2 } }) as unknown as {
      listeners: Record<string, () => void>
    }

    expect(marker.listeners['click']).toBeUndefined()
  })
})

describe('useMap – geocodeAddress', () => {
  function stubGeocoder(status: string, results: unknown) {
    window.google = {
      ...window.google,
      maps: {
        ...window.google?.maps,
        Geocoder: vi.fn(function (this: { geocode: unknown }) {
          this.geocode = vi.fn(
            (_request: unknown, callback: (results: unknown, status: string) => void) => {
              callback(results, status)
            }
          )
        }) as unknown as typeof google.maps.Geocoder,
      },
    } as typeof google
  }

  it('resolves lat/lng when geocoding succeeds', async () => {
    stubGeocoder('OK', [{ geometry: { location: { lat: () => 10, lng: () => 20 } } }])
    const { geocodeAddress } = useMap()

    const result = await geocodeAddress('1600 Amphitheatre Pkwy')

    expect(result).toEqual({ lat: 10, lng: 20 })
  })

  it('resolves null when geocoding fails', async () => {
    stubGeocoder('ZERO_RESULTS', [])
    const { geocodeAddress } = useMap()

    const result = await geocodeAddress('nowhere')

    expect(result).toBeNull()
  })
})

describe('useMap – reverseGeocode', () => {
  function stubGeocoder(status: string, results: unknown) {
    window.google = {
      ...window.google,
      maps: {
        ...window.google?.maps,
        Geocoder: vi.fn(function (this: { geocode: unknown }) {
          this.geocode = vi.fn(
            (_request: unknown, callback: (results: unknown, status: string) => void) => {
              callback(results, status)
            }
          )
        }) as unknown as typeof google.maps.Geocoder,
      },
    } as typeof google
  }

  it('resolves the formatted address when reverse geocoding succeeds', async () => {
    stubGeocoder('OK', [{ formatted_address: '1 Main St' }])
    const { reverseGeocode } = useMap()

    const result = await reverseGeocode(10, 20)

    expect(result).toBe('1 Main St')
  })

  it('resolves null when reverse geocoding fails', async () => {
    stubGeocoder('ZERO_RESULTS', [])
    const { reverseGeocode } = useMap()

    const result = await reverseGeocode(0, 0)

    expect(result).toBeNull()
  })
})

describe('useMap – getPlaceDetails', () => {
  function stubPlacesService(status: string, place: unknown) {
    window.google = {
      ...window.google,
      maps: {
        ...window.google?.maps,
        places: {
          ...window.google?.maps?.places,
          PlacesServiceStatus: { OK: 'OK' },
          PlacesService: vi.fn(function (this: { getDetails: unknown }) {
            this.getDetails = vi.fn(
              (_request: unknown, callback: (place: unknown, status: string) => void) => {
                callback(place, status)
              }
            )
          }),
        } as unknown as typeof google.maps.places,
      },
    } as typeof google
  }

  it('resolves full place details when the request succeeds', async () => {
    stubPlacesService('OK', {
      place_id: 'abc',
      name: 'Cafe',
      formatted_address: '123 Main St',
      geometry: { location: { lat: () => 1, lng: () => 2 } },
      website: 'https://cafe.example',
      formatted_phone_number: '555-1234',
      opening_hours: { weekday_text: ['Mon: 9-5'] },
      rating: 4.5,
      user_ratings_total: 100,
      url: 'https://maps.example/cafe',
      types: ['cafe'],
    })
    const { getPlaceDetails } = useMap()
    const map = {} as google.maps.Map

    const result = await getPlaceDetails(map, 'abc')

    expect(result).toEqual({
      placeId: 'abc',
      name: 'Cafe',
      address: '123 Main St',
      latitude: 1,
      longitude: 2,
      website: 'https://cafe.example',
      phone: '555-1234',
      rating: 4.5,
      userRatingCount: 100,
      openingHours: ['Mon: 9-5'],
      googleMapsUrl: 'https://maps.example/cafe',
      types: ['cafe'],
    })
  })

  it('falls back to defaults when optional fields are missing', async () => {
    stubPlacesService('OK', {
      place_id: undefined,
      geometry: { location: { lat: () => 1, lng: () => 2 } },
    })
    const { getPlaceDetails } = useMap()
    const map = {} as google.maps.Map

    const result = await getPlaceDetails(map, 'fallback-id')

    expect(result).toMatchObject({
      placeId: 'fallback-id',
      name: 'Untitled place',
      address: 'Address unavailable',
      types: [],
    })
  })

  it('resolves null when the request fails or has no location', async () => {
    stubPlacesService('NOT_FOUND', null)
    const { getPlaceDetails } = useMap()
    const map = {} as google.maps.Map

    const result = await getPlaceDetails(map, 'missing')

    expect(result).toBeNull()
  })
})
