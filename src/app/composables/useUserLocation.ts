import { ref, toRaw } from 'vue'
import {
  clearLastPosition,
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

export function useUserLocation() {
  const mapStore = useMapStore()
  const notifications = useNotificationsStore()
  const locating = ref(false)

  // Where the map started; a fix is only applied if nothing has moved or zoomed the map since
  let initialMap: {
    map: google.maps.Map
    center: google.maps.LatLng | undefined
    zoom: number | undefined
  } | null = null

  /** Record the freshly created map's starting view for the "unmoved" guard. */
  function trackInitialMap(map: google.maps.Map): void {
    initialMap = { map, center: map.getCenter(), zoom: map.getZoom() }
  }

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
   * Where the map may start: the stored last-known position, unless the store already has a
   * center or permission is not granted/unknown (a denied permission also forgets the position).
   */
  async function resolveInitialCenter(): Promise<{ lat: number; lng: number } | null> {
    if (mapStore.center) return null

    const permission = await queryGeolocationPermission()
    if (permission === 'denied') {
      clearLastPosition()
      return null
    }
    if (permission !== 'granted' && permission !== 'unknown') return null

    const last = getLastPosition()
    return last && { lat: last.lat, lng: last.lng }
  }

  /**
   * Locate the user without a gesture, in parallel with Maps loading. Asks at most once: after
   * that it only runs when permission is already granted (or blocked, in which case never).
   * A fix arriving before the map exists becomes its initial center; a later one only pans a map
   * that hasn't moved or zoomed since `trackInitialMap`.
   */
  async function centerOnUserOnce({ isActive }: { isActive: () => boolean }): Promise<void> {
    if (!navigator.geolocation) return

    const state = await queryGeolocationPermission()
    if (state === 'denied') clearLastPosition()
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
      const instance = mapStore.mapInstance
      const map = instance && toRaw(instance)
      if (map) {
        map.panTo(position)
        map.setZoom(LOCATE_ME_ZOOM)
      } else {
        mapStore.setCenter(position)
        mapStore.setZoom(LOCATE_ME_ZOOM)
      }
    } catch (err) {
      markAskedForLocation()
      const denied = (err as { code?: number } | null)?.code === 1
      if (denied) clearLastPosition()
      notifications.error(
        denied
          ? 'Location access is blocked. Allow location for this site in your browser settings to use it.'
          : "We couldn't determine your location. Please try again."
      )
    } finally {
      locating.value = false
    }
  }

  return { locating, locateMe, centerOnUserOnce, resolveInitialCenter, trackInitialMap }
}
