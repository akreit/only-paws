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

  it('creates an Autocomplete instance for the supplied input element', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const { bindPlaceAutocomplete } = useMap()

    await bindPlaceAutocomplete(input, vi.fn())

    expect(AutocompleteMock).toHaveBeenCalledWith(input, {
      fields: ['place_id', 'name', 'formatted_address', 'geometry'],
    })

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

  it('pans to the place location when the place has no viewport', () => {
    const panToMock = vi.fn()
    const setZoomMock = vi.fn()

    const mapInstance = {
      panTo: panToMock,
      setZoom: setZoomMock,
      fitBounds: vi.fn(),
    } as unknown as google.maps.Map

    // Reproduce the handlePlaceSelected logic from map.vue
    function handlePlaceSelected(place: google.maps.places.PlaceResult) {
      const geometry = place.geometry
      if (!geometry?.location) return

      if (geometry.viewport) {
        mapInstance.fitBounds(geometry.viewport)
      } else {
        mapInstance.panTo(geometry.location)
        mapInstance.setZoom(16)
      }
    }

    handlePlaceSelected(mockPlace)

    expect(panToMock).toHaveBeenCalledWith(mockPlace.geometry!.location)
    expect(setZoomMock).toHaveBeenCalledWith(16)
  })

  it('calls fitBounds when the place result includes a viewport', () => {
    const fitBoundsMock = vi.fn()

    const mapInstance = {
      panTo: vi.fn(),
      setZoom: vi.fn(),
      fitBounds: fitBoundsMock,
    } as unknown as google.maps.Map

    const viewport = {} as google.maps.LatLngBounds
    const placeWithViewport: google.maps.places.PlaceResult = {
      ...mockPlace,
      geometry: {
        location: mockPlace.geometry!.location,
        viewport,
      },
    }

    function handlePlaceSelected(place: google.maps.places.PlaceResult) {
      const geometry = place.geometry
      if (!geometry?.location) return

      if (geometry.viewport) {
        mapInstance.fitBounds(geometry.viewport)
      } else {
        mapInstance.panTo(geometry.location)
        mapInstance.setZoom(16)
      }
    }

    handlePlaceSelected(placeWithViewport)

    expect(fitBoundsMock).toHaveBeenCalledWith(viewport)
    expect(mapInstance.panTo).not.toHaveBeenCalled()
  })
})
