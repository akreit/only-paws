import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let isLoaded = false

export function useMap() {
  const config = useRuntimeConfig()
  const mapStore = useMapStore()

  async function loadGoogleMaps(): Promise<typeof google.maps> {
    if (isLoaded && window.google?.maps) {
      return window.google.maps
    }

    // Configure the loader with options
    setOptions({
      key: config.public.googleMapsApiKey as string,
    })

    // Import required libraries
    await Promise.all([importLibrary('places'), importLibrary('geometry'), importLibrary('maps')])

    isLoaded = true
    return window.google.maps
  }

  async function initializeMap(element: HTMLElement): Promise<google.maps.Map> {
    await loadGoogleMaps()

    const map = new google.maps.Map(element, {
      center: mapStore.center,
      zoom: mapStore.zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    })

    mapStore.setMapInstance(map)

    // Update store when map changes
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
