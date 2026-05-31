import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let isLoaded = false

export function useMap() {
  const config = useRuntimeConfig()
  const mapStore = useMapStore()

  async function loadGoogleMaps(): Promise<typeof google.maps> {
    if (isLoaded && window.google?.maps) {
      return window.google.maps
    }

    setOptions({ key: config.public.googleMapsApiKey as string })

    try {
      await Promise.all([importLibrary('places'), importLibrary('geometry'), importLibrary('maps')])
    } catch (err) {
      console.error('[Maps] Failed to import libraries:', err)
      throw err
    }

    isLoaded = true
    return window.google.maps
  }

  async function initializeMap(element: HTMLElement): Promise<google.maps.Map> {
    await loadGoogleMaps()

    const center = mapStore.center ?? { lat: 12.9716, lng: 77.5946 }
    const zoom = mapStore.zoom

    const map = new google.maps.Map(element, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    })

    // Surface API key auth errors (referrer restrictions, billing, etc.)
    ;(window as Window & { gm_authFailure?: () => void }).gm_authFailure = () => {
      console.error(
        '[Maps] Authentication failed — check API key referrer restrictions and billing'
      )
    }

    mapStore.setMapInstance(map)

    map.addListener('center_changed', () => {
      const center = map.getCenter()
      if (center) {
        mapStore.setCenter({ lat: center.lat(), lng: center.lng() })
      }
    })

    map.addListener('zoom_changed', () => {
      mapStore.setZoom(map.getZoom() || mapStore.zoom)
    })

    map.addListener('bounds_changed', () => {
      const bounds = map.getBounds()
      if (bounds) {
        mapStore.setBounds(bounds)
      }
    })

    return map
  }

  function createMarker(options: {
    map: google.maps.Map
    position: { lat: number; lng: number }
    title?: string
    icon?: google.maps.Icon | google.maps.Symbol
    onClick?: () => void
  }): google.maps.Marker {
    const marker = new google.maps.Marker({
      map: options.map,
      position: options.position,
      title: options.title,
      icon: options.icon,
    })

    if (options.onClick) {
      marker.addListener('click', options.onClick)
    }

    return marker
  }

  async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    await loadGoogleMaps()
    const geocoder = new google.maps.Geocoder()

    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location
          resolve({ lat: location.lat(), lng: location.lng() })
        } else {
          resolve(null)
        }
      })
    })
  }

  async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    await loadGoogleMaps()
    const geocoder = new google.maps.Geocoder()

    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0].formatted_address)
        } else {
          resolve(null)
        }
      })
    })
  }

  return {
    loadGoogleMaps,
    initializeMap,
    createMarker,
    geocodeAddress,
    reverseGeocode,
    mapStore,
  }
}
