import { computed, onMounted, watch, type Ref } from 'vue'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { Location } from '~/types'
import { parsePlaceQuery, withPlaceQuery } from '~/utils/map-place-query'

export interface UseMapPlaceQueryOptions {
  route: { query: LocationQuery }
  router: {
    push: (to: { query: LocationQueryRaw }) => unknown
    replace: (to: { query: LocationQueryRaw }) => unknown
  }
  locations: Ref<Location[]>
  selectedSavedLocation: Ref<Location | null>
  openLocation: (location: Location) => void
  closeLocation: () => void
  /** Pan/zoom to a place that was opened from the URL (not from a map/search click). */
  focusLocation: (location: Location) => void
  fetchLocation: (id: string) => Promise<Location>
}

/**
 * Keeps the open stored-place panel in sync with `?place=<id>`. The query is the single
 * source of truth: opening pushes it (so Back closes the panel), closing replaces it, and a
 * watcher opens/closes the panel from it (deep links, Back/Forward).
 */
export function useMapPlaceQuery(options: UseMapPlaceQueryOptions) {
  const { route, router, locations, selectedSavedLocation } = options
  const placeId = computed(() => parsePlaceQuery(route.query))

  let run = 0
  // Location the user just opened locally; avoids a lookup and a map re-focus
  let local: Location | null = null

  /** Requests the panel for a location by pushing it to the URL. */
  function open(location: Location) {
    if (placeId.value === location.id) {
      if (selectedSavedLocation.value?.id !== location.id) options.openLocation(location)
      return
    }
    local = location
    void router.push({ query: withPlaceQuery(route.query, location.id) })
  }

  /** Pushes a place id that may not be loaded; the watcher fetches it. */
  function openById(id: string) {
    const known = locations.value.find((item) => item.id === id)
    if (known) {
      open(known)
      return
    }
    if (placeId.value !== id) void router.push({ query: withPlaceQuery(route.query, id) })
  }

  /** Drops `place` from the URL without adding a history entry. */
  function clear() {
    if (!placeId.value) return
    void router.replace({ query: withPlaceQuery(route.query, null) })
  }

  async function sync(id: string | null) {
    const current = ++run

    if (!id) {
      local = null
      // Only a stored-place panel is closed; a Google preview stays open
      if (selectedSavedLocation.value) options.closeLocation()
      return
    }

    if (selectedSavedLocation.value?.id === id) {
      local = null
      return
    }

    const fromLocal = local?.id === id
    const known = fromLocal ? local : locations.value.find((item) => item.id === id)
    local = null

    if (known) {
      options.openLocation(known)
      if (!fromLocal) options.focusLocation(known)
      return
    }

    try {
      const fetched = await options.fetchLocation(id)
      if (current !== run) return
      options.openLocation(fetched)
      options.focusLocation(fetched)
    } catch {
      if (current !== run) return
      clear()
    }
  }

  watch(placeId, (id) => void sync(id))
  onMounted(() => {
    if (placeId.value) void sync(placeId.value)
  })

  return { placeId, open, openById, clear }
}
