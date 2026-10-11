import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { GooglePlaceDetails, Location, LocationType } from '~/types'
import { debounce } from '~/utils/helpers'
import { getSearchResultMarkerIcon, toGoogleIcon } from '~/utils/map-markers'
import {
  buildSearchDropdown,
  isSearchableQuery,
  type PlaceSuggestion,
  type SearchResultItem,
} from '~/utils/map-search'
import { useLocations } from '~/composables/useLocations'
import { useMap } from '~/composables/useMap'
import { usePlacesSearch } from '~/composables/usePlacesSearch'

const SEARCH_DEBOUNCE_MS = 300

export interface UseMapSearchOptions {
  getMap: () => google.maps.Map | null
  selectedType: Ref<LocationType | null>
  /** Called whenever the saved-location list was refreshed by the latest request. */
  onLocationsUpdated: () => void
  /** Opens a saved place chosen from the search results (defaults to showing the panel directly). */
  requestOpenLocation?: (location: Location) => void
}

/**
 * Map search: saved places (via the locations API) + Google suggestions, the
 * dropdown model, selection handling and the temporary search-result pin.
 */
export function useMapSearch(options: UseMapSearchOptions) {
  const { getMap, selectedType } = options
  const { fetchLocations, locations } = useLocations()
  const { createMarker } = useMap()
  const notifications = useNotificationsStore()
  const { placesUnavailable, fetchSuggestions, selectSuggestion, getPlaceDetails, resetSession } =
    usePlacesSearch()

  const selectedPlace = ref<GooglePlaceDetails | null>(null)
  const selectedSavedLocation = ref<Location | null>(null)
  const placeDetailsLoading = ref(false)

  const query = ref('')
  const suggestions = ref<PlaceSuggestion[]>([])
  const loading = ref(false)
  // Query the dropdown results belong to; empty means "not searching"
  const activeSearch = ref('')

  let searchMarker: google.maps.Marker | null = null
  let searchRun = 0
  let selectRun = 0

  const model = computed(() =>
    buildSearchDropdown(activeSearch.value ? locations.value : [], suggestions.value)
  )

  /** Loads saved locations for the current filter/query; redraws only for the latest request. */
  async function refreshLocations() {
    try {
      const result = await fetchLocations({
        type: selectedType.value || undefined,
        search: isSearchableQuery(query.value) ? query.value.trim() : undefined,
      })
      if (result === null) return
    } catch (error) {
      console.error('Failed to load locations:', error)
    }
    options.onLocationsUpdated()
  }

  async function runSearch() {
    const run = ++searchRun
    const text = query.value.trim()

    if (!isSearchableQuery(text)) {
      // Cleared (or too short): restore the normal listing
      activeSearch.value = ''
      suggestions.value = []
      loading.value = false
      resetSession()
      await refreshLocations()
      return
    }

    activeSearch.value = text
    loading.value = true

    const [, found] = await Promise.all([refreshLocations(), fetchSuggestions(text)])

    if (run !== searchRun) return
    suggestions.value = found
    loading.value = false
  }

  const debouncedSearch = debounce(() => {
    void runSearch()
  }, SEARCH_DEBOUNCE_MS)

  watch(query, () => {
    // Drop stale results right away so they never sit next to a different query
    if (!isSearchableQuery(query.value)) {
      activeSearch.value = ''
      suggestions.value = []
    }
    debouncedSearch()
  })

  // Re-run under the new category filter (and refresh the open dropdown)
  watch(selectedType, () => {
    void runSearch()
  })

  function clearMarker() {
    searchMarker?.setMap(null)
    searchMarker = null
  }

  /** Closes the preview, drops the search pin and cancels any selection in flight. */
  function dismiss() {
    selectRun++
    selectedPlace.value = null
    selectedSavedLocation.value = null
    placeDetailsLoading.value = false
    clearMarker()
  }

  /**
   * Shared guarded flow for Google lookups: dismisses the current selection, shows the
   * loading state and resolves to the result, or null if superseded or unavailable.
   */
  async function loadGooglePlace<T>(load: () => Promise<T | null>): Promise<T | null> {
    dismiss()
    const run = selectRun
    placeDetailsLoading.value = true
    const result = await load()
    if (run !== selectRun) return null
    placeDetailsLoading.value = false

    if (!result) {
      notifications.error('Could not load details for that place')
      return null
    }
    return result
  }

  /** Opens the stored-place panel for a saved location (replaces any other selection). */
  function openLocation(location: Location) {
    dismiss()
    selectedSavedLocation.value = location
  }

  async function select(item: SearchResultItem) {
    const map = getMap()
    if (!map) return

    if (item.kind === 'saved') {
      const { location } = item
      const open = options.requestOpenLocation ?? openLocation
      open(location)
      map.panTo({ lat: location.latitude, lng: location.longitude })
      map.setZoom(16)
      return
    }

    const result = await loadGooglePlace(() => selectSuggestion(item.suggestion))
    if (!result) return

    const { details, viewport } = result
    selectedPlace.value = details

    if (viewport) {
      map.fitBounds(viewport)
    } else {
      map.panTo({ lat: details.latitude, lng: details.longitude })
      map.setZoom(16)
    }

    searchMarker = createMarker({
      map,
      position: { lat: details.latitude, lng: details.longitude },
      title: details.name,
      icon: toGoogleIcon(getSearchResultMarkerIcon()),
    })
  }

  /** Opens details for a Google POI clicked on the map (no search pin: the POI is already shown). */
  async function selectPlaceId(
    placeId: string,
    position?: google.maps.LatLng | google.maps.LatLngLiteral | null
  ) {
    const map = getMap()
    if (!map) return

    const details = await loadGooglePlace(() => getPlaceDetails(placeId))
    if (!details) return

    selectedPlace.value = details
    map.panTo(position ?? { lat: details.latitude, lng: details.longitude })
  }

  onBeforeUnmount(() => {
    clearMarker()
    resetSession()
  })

  return {
    query,
    model,
    loading,
    placesUnavailable,
    selectedPlace,
    selectedSavedLocation,
    placeDetailsLoading,
    select,
    openLocation,
    selectPlaceId,
    dismiss,
    refreshLocations,
  }
}
