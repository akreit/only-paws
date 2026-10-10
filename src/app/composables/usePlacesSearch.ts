import { toRaw } from 'vue'
import { importLibrary } from '@googlemaps/js-api-loader'
import type { GooglePlaceDetails } from '~/types'
import { placeToGooglePlaceDetails, type PlaceSuggestion } from '~/utils/map-search'

const PLACE_FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'viewport', 'types']
const FALLBACK_BIAS_RADIUS_METERS = 20000

interface SelectedGooglePlace {
  details: GooglePlaceDetails
  viewport: google.maps.LatLngBounds | null
}

/**
 * Autocomplete + place lookup via the new Places API. Never throws: failures
 * flip `placesUnavailable` and yield empty results.
 */
export function usePlacesSearch() {
  const mapStore = useMapStore()
  const placesUnavailable = ref(false)
  const searching = ref(false)

  let sessionToken: google.maps.places.AutocompleteSessionToken | null = null
  // Only the newest request may update `searching`
  let requestId = 0
  // Raw predictions are kept out of the UI model; toPlace() needs them
  const predictions = new Map<string, google.maps.places.PlacePrediction>()

  function buildLocationBias(): google.maps.places.AutocompleteRequest['locationBias'] {
    // Store values are Vue proxies; hand Google plain literals instead
    const bounds = toRaw(mapStore.bounds) ?? toRaw(mapStore.mapInstance)?.getBounds() ?? null
    if (bounds) return typeof bounds.toJSON === 'function' ? bounds.toJSON() : bounds

    const center = toRaw(mapStore.center)
    return center
      ? { center: { lat: center.lat, lng: center.lng }, radius: FALLBACK_BIAS_RADIUS_METERS }
      : undefined
  }

  async function fetchSuggestions(input: string): Promise<PlaceSuggestion[]> {
    const id = ++requestId
    searching.value = true

    try {
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await importLibrary('places')
      sessionToken ??= new AutocompleteSessionToken()

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken,
        locationBias: buildLocationBias(),
      })

      placesUnavailable.value = false
      predictions.clear()
      return suggestions.flatMap(({ placePrediction }) => {
        if (!placePrediction) return []
        predictions.set(placePrediction.placeId, placePrediction)
        return [
          {
            placeId: placePrediction.placeId,
            mainText: placePrediction.mainText?.text ?? placePrediction.text.text,
            secondaryText: placePrediction.secondaryText?.text ?? '',
          },
        ]
      })
    } catch (error) {
      console.error('[Places] Autocomplete failed:', error)
      placesUnavailable.value = true
      return []
    } finally {
      if (id === requestId) searching.value = false
    }
  }

  async function selectSuggestion(
    suggestion: PlaceSuggestion
  ): Promise<SelectedGooglePlace | null> {
    try {
      const prediction = predictions.get(suggestion.placeId)
      let place: google.maps.places.Place
      if (prediction) {
        place = prediction.toPlace()
      } else {
        const { Place } = await importLibrary('places')
        place = new Place({ id: suggestion.placeId })
      }
      await place.fetchFields({ fields: PLACE_FIELDS })

      const details = placeToGooglePlaceDetails(place, suggestion.placeId)
      return details ? { details, viewport: place.viewport ?? null } : null
    } catch (error) {
      console.error('[Places] Failed to load place:', error)
      return null
    } finally {
      // A selection ends the billing session
      resetSession()
    }
  }

  function resetSession() {
    sessionToken = null
    predictions.clear()
  }

  return { placesUnavailable, searching, fetchSuggestions, selectSuggestion, resetSession }
}
