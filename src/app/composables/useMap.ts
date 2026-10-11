import { ref } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import {
  distanceMeters,
  getLastPosition,
  hasAskedForLocation,
  markAskedForLocation,
  queryGeolocationPermission,
  saveLastPosition,
  shouldAutoLocate,
} from '~/utils/geolocation-preference'

// Coarse, cached fixes are plenty for centering a map and much faster than GPS
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 10 * 60 * 1000,
}
const MIN_PAN_METERS = 100
const LOCATE_ME_ZOOM = 15
const PRELOAD_REFRESH_INTERVAL_MS = 60_000

// Shared so concurrent callers (page setup, map init, geocoding) trigger a single load
let loadPromise: Promise<typeof google.maps> | null = null
// Shared so repeated preloads (hover on several links) don't re-query the position
let lastRefreshAt = 0

export function useMap() {
  const config = useRuntimeConfig()
  const mapStore = useMapStore()
  const notifications = useNotificationsStore()
  const locating = ref(false)

  function loadGoogleMaps(): Promise<typeof google.maps> {
    if (!loadPromise) setOptions({ key: config.public.googleMapsApiKey as string })

    return (loadPromise ??= importLibrary('maps').then(
      () => window.google.maps,
      (err) => {
        console.error('[Maps] Failed to import libraries:', err)
        loadPromise = null
        throw err
      }
    ))
  }

  /** Warm the Places library (e.g. on search focus); never throws. */
  function prefetchPlaces(): void {
    void loadGoogleMaps()
      .then(() => importLibrary('places'))
      .catch(() => {})
  }

  // Where the map started; a fix is only applied if nothing has moved or zoomed the map since
  let initialMap: {
    map: google.maps.Map
    center: google.maps.LatLng | undefined
    zoom: number | undefined
  } | null = null

  function getFix(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ code: 0 })
        return
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
        reject,
        GEOLOCATION_OPTIONS
      )
    })
  }

  /**
   * Locate the user without a gesture, in parallel with Maps loading. Asks at most once: after
   * that it only runs when permission is already granted (or blocked, in which case never).
   * A fix arriving before the map exists becomes its initial center; a later one only pans a map
   * that hasn't moved or zoomed.
   */
  async function centerOnUserOnce({ isActive }: { isActive: () => boolean }): Promise<void> {
    if (!navigator.geolocation) return

    const state = await queryGeolocationPermission()
    if (!isActive() || !shouldAutoLocate(state, hasAskedForLocation())) return
    if (state !== 'granted') markAskedForLocation()

    let position: { lat: number; lng: number }
    try {
      position = await getFix()
    } catch {
      return
    }
    saveLastPosition(position)
    if (!isActive()) return

    if (!initialMap) {
      mapStore.setCenter(position)
      return
    }
    const { map, center, zoom } = initialMap
    if ((center && !map.getCenter()?.equals(center)) || map.getZoom() !== zoom) return
    const current = map.getCenter()
    // The map may already start at the last known position; skip jitter-sized corrections
    if (
      current &&
      distanceMeters({ lat: current.lat(), lng: current.lng() }, position) < MIN_PAN_METERS
    ) {
      return
    }
    // center_changed keeps the store in sync
    map.panTo(position)
  }

  /** Explicit "Use my location": a user gesture, so it ignores the moved/zoomed guard. */
  async function locateMe(): Promise<void> {
    if (locating.value) return
    locating.value = true
    try {
      const position = await getFix()
      markAskedForLocation()
      saveLastPosition(position)
      const map = mapStore.mapInstance
      if (map) {
        map.panTo(position)
        map.setZoom(LOCATE_ME_ZOOM)
      } else {
        mapStore.setCenter(position)
        mapStore.setZoom(LOCATE_ME_ZOOM)
      }
    } catch (err) {
      markAskedForLocation()
      notifications.error(
        (err as { code?: number } | null)?.code === 1
          ? 'Location access is blocked. Allow location for this site in your browser settings to use it.'
          : "We couldn't determine your location. Please try again."
      )
    } finally {
      locating.value = false
    }
  }

  /**
   * Warm what /map needs: the Maps script and, only if permission is already granted (so it can
   * never prompt), the stored last-known position. Idempotent; never throws.
   */
  function preloadMap(): void {
    void loadGoogleMaps().catch(() => {})

    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    const now = Date.now()
    if (now - lastRefreshAt < PRELOAD_REFRESH_INTERVAL_MS) return
    lastRefreshAt = now

    void (async () => {
      if ((await queryGeolocationPermission()) !== 'granted') return
      saveLastPosition(await getFix())
    })().catch(() => {})
  }

  async function initializeMap(element: HTMLElement): Promise<google.maps.Map> {
    // Permission only decides whether the stored position may seed the initial center
    const [, permission] = await Promise.all([
      loadGoogleMaps(),
      mapStore.center ? null : queryGeolocationPermission(),
    ])
    const lastPosition =
      permission === 'granted' || permission === 'unknown' ? getLastPosition() : null

    const center = mapStore.center ??
      (lastPosition && { lat: lastPosition.lat, lng: lastPosition.lng }) ?? {
        lat: 12.9716,
        lng: 77.5946,
      }
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

    initialMap = { map, center: map.getCenter(), zoom: map.getZoom() }
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
    const { Geocoder } = await importLibrary('geocoding')
    const geocoder = new Geocoder()

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
    const { Geocoder } = await importLibrary('geocoding')
    const geocoder = new Geocoder()

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
    prefetchPlaces,
    initializeMap,
    centerOnUserOnce,
    locateMe,
    locating,
    preloadMap,
    createMarker,
    geocodeAddress,
    reverseGeocode,
    mapStore,
  }
}
