import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMap } from '~/composables/useMap'

vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn().mockResolvedValue({}),
}))

// Nuxt auto-imports are not available in vitest — stub them globally
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { googleMapsApiKey: 'test-key' },
}))

vi.stubGlobal('useMapStore', () => ({
  center: null,
  zoom: 13,
  setCenter: vi.fn(),
  setZoom: vi.fn(),
  setBounds: vi.fn(),
  setMapInstance: vi.fn(),
}))

/** Mirror of map.vue's handlePlaceSelected used across navigation tests. */
function makeNavigationHandler(mapInstance: google.maps.Map) {
  return function handlePlaceSelected(place: google.maps.places.PlaceResult) {
    const geometry = place.geometry
    if (!geometry?.location) return

    if (geometry.viewport) {
      mapInstance.fitBounds(geometry.viewport)
    } else {
      mapInstance.panTo(geometry.location)
      mapInstance.setZoom(16)
    }
  }
}

describe('useMap – bindPlaceAutocomplete', () => {
  let listeners: Record<string, (() => void)[]>
  let mockPlace: google.maps.places.PlaceResult
  let AutocompleteMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    listeners = {}
    mockPlace = {
      place_id: 'place-abc',
      name: 'Central Park',
      formatted_address: 'New York, NY, USA',
      geometry: {
        location: {
          lat: () => 40.7829,
          lng: () => -73.9654,
        } as google.maps.LatLng,
        viewport: undefined,
      },
    }

    AutocompleteMock = vi.fn(function (this: Record<string, unknown>) {
      this.addListener = vi.fn((event: string, cb: () => void) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(cb)
      })
      this.getPlace = vi.fn().mockReturnValue(mockPlace)
    })

    window.google = {
      ...window.google,
      maps: {
        ...window.google?.maps,
        places: {
          Autocomplete: AutocompleteMock,
        } as unknown as typeof google.maps.places,
      },
    } as typeof google
  })

  it('creates an Autocomplete instance for the supplied input element and returns it', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const { bindPlaceAutocomplete } = useMap()

    const result = await bindPlaceAutocomplete(input, vi.fn())

    expect(AutocompleteMock).toHaveBeenCalledWith(input, {
      fields: ['place_id', 'name', 'formatted_address', 'geometry'],
    })
    expect(result).toBeDefined()

    document.body.removeChild(input)
  })

  it('calls the callback with the selected place when place_changed fires', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const onPlaceChanged = vi.fn()
    const { bindPlaceAutocomplete } = useMap()

    await bindPlaceAutocomplete(input, onPlaceChanged)

    // Simulate Google Maps firing the place_changed event
    listeners['place_changed']?.forEach((cb) => cb())

    expect(onPlaceChanged).toHaveBeenCalledOnce()
    expect(onPlaceChanged).toHaveBeenCalledWith(mockPlace)

    document.body.removeChild(input)
  })

  it('pans to the place location and sets zoom when the place has no viewport', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    const mapInstance = {
      panTo: vi.fn(),
      setZoom: vi.fn(),
      fitBounds: vi.fn(),
    } as unknown as google.maps.Map

    const { bindPlaceAutocomplete } = useMap()
    await bindPlaceAutocomplete(input, makeNavigationHandler(mapInstance))

    listeners['place_changed']?.forEach((cb) => cb())

    expect(mapInstance.panTo).toHaveBeenCalledWith(mockPlace.geometry!.location)
    expect(mapInstance.setZoom).toHaveBeenCalledWith(16)
    expect(mapInstance.fitBounds).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('calls fitBounds when the place result includes a viewport', async () => {
    const viewport = {} as google.maps.LatLngBounds
    const placeWithViewport: google.maps.places.PlaceResult = {
      ...mockPlace,
      geometry: { location: mockPlace.geometry!.location, viewport },
    }

    AutocompleteMock = vi.fn(function (this: Record<string, unknown>) {
      this.addListener = vi.fn((event: string, cb: () => void) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(cb)
      })
      this.getPlace = vi.fn().mockReturnValue(placeWithViewport)
    })
    window.google.maps.places = {
      Autocomplete: AutocompleteMock,
    } as unknown as typeof google.maps.places

    const input = document.createElement('input')
    document.body.appendChild(input)

    const mapInstance = {
      panTo: vi.fn(),
      setZoom: vi.fn(),
      fitBounds: vi.fn(),
    } as unknown as google.maps.Map

    const { bindPlaceAutocomplete } = useMap()
    await bindPlaceAutocomplete(input, makeNavigationHandler(mapInstance))

    listeners['place_changed']?.forEach((cb) => cb())

    expect(mapInstance.fitBounds).toHaveBeenCalledWith(viewport)
    expect(mapInstance.panTo).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })
})
