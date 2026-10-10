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
import { locationToPlaceDetails } from '~/utils/google-place'
import { useLocations } from '~/composables/useLocations'
import { useMap } from '~/composables/useMap'
import { usePlacesSearch } from '~/composables/usePlacesSearch'

const SEARCH_DEBOUNCE_MS = 300

export interface UseMapSearchOptions {
  getMap: () => google.maps.Map | null
  selectedType: Ref<LocationType | null>
  selectedPlace: Ref<GooglePlaceDetails | null>
  selectedSavedLocation: Ref<Location | null>
  placeDetailsLoading: Ref<boolean>
  /** Called whenever the saved-location list was refreshed by the latest request. */
  onLocationsUpdated: () => void
}

/**
 * Map search: saved places (via the locations API) + Google suggestions, the
 * dropdown model, selection handling and the temporary search-result pin.
 */
export function useMapSearch(options: UseMapSearchOptions) {
  const { getMap, selectedType, selectedPlace, selectedSavedLocation, placeDetailsLoading } =
    options
  const { fetchLocations, locations } = useLocations()
  const { createMarker } = useMap()
  const notifications = useNotificationsStore()
  const { placesUnavailable, fetchSuggestions, selectSuggestion, getPlaceDetails, resetSession } =
    usePlacesSearch()

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

  async function select(item: SearchResultItem) {
    const map = getMap()
    if (!map) return

    dismiss()

    if (item.kind === 'saved') {
      const { location } = item
      selectedSavedLocation.value = location
      selectedPlace.value = locationToPlaceDetails(location)
      map.panTo({ lat: location.latitude, lng: location.longitude })
      map.setZoom(16)
      return
    }

    const run = selectRun
    placeDetailsLoading.value = true
    const result = await selectSuggestion(item.suggestion)
    if (run !== selectRun) return
    placeDetailsLoading.value = false

    if (!result) {
      notifications.error('Could not load details for that place')
      return
    }

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

  onBeforeUnmount(() => {
    clearMarker()
    resetSession()
  })

  return {
    query,
    model,
    loading,
    placesUnavailable,
    select,
    dismiss,
    clearMarker,
    runSearch,
    refreshLocations,
    getPlaceDetails,
  }
}
