import { toRaw } from 'vue'
import { importLibrary } from '@googlemaps/js-api-loader'
import type { GooglePlaceDetails } from '~/types'
import { PLACE_DETAIL_FIELDS, placeToGooglePlaceDetails } from '~/utils/google-place'
import type { PlaceSuggestion } from '~/utils/map-search'

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

  let sessionToken: google.maps.places.AutocompleteSessionToken | null = null
  // Raw predictions are kept out of the UI model; toPlace() needs them
  const predictions = new Map<string, google.maps.places.PlacePrediction>()

  function buildLocationBias(): google.maps.places.AutocompleteRequest['locationBias'] {
    // Store values are Vue proxies; hand Google plain literals instead
    const bounds = toRaw(mapStore.mapInstance)?.getBounds()?.toJSON()
    if (bounds) return bounds

    const center = toRaw(mapStore.center)
    return center
      ? { center: { lat: center.lat, lng: center.lng }, radius: FALLBACK_BIAS_RADIUS_METERS }
      : undefined
  }

  async function fetchSuggestions(input: string): Promise<PlaceSuggestion[]> {
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
    }
  }

  async function loadPlace(
    place: google.maps.places.Place,
    fallbackPlaceId: string
  ): Promise<SelectedGooglePlace | null> {
    await place.fetchFields({ fields: PLACE_DETAIL_FIELDS })

    const details = placeToGooglePlaceDetails(place, fallbackPlaceId)
    return details ? { details, viewport: place.viewport ?? null } : null
  }

  /** Full details for a place id (e.g. a POI clicked on the map). Never throws. */
  async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    try {
      const { Place } = await importLibrary('places')
      return (await loadPlace(new Place({ id: placeId }), placeId))?.details ?? null
    } catch (error) {
      console.error('[Places] Failed to load place:', error)
      return null
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
      return await loadPlace(place, suggestion.placeId)
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

  return { placesUnavailable, fetchSuggestions, selectSuggestion, getPlaceDetails, resetSession }
}
