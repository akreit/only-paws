import {
  LocationType,
  type CreateLocationInput,
  type GooglePlaceDetails,
  type Location,
} from '~/types'

/** Fields requested from the Places API (New) for every place lookup. */
export const PLACE_DETAIL_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'viewport',
  'types',
  'websiteURI',
  'nationalPhoneNumber',
  'regularOpeningHours',
  'rating',
  'userRatingCount',
  'googleMapsURI',
]

/** Subset of a fetched `google.maps.places.Place` needed to build a preview. */
export interface FetchedPlaceData {
  id?: string | null
  displayName?: string | null
  formattedAddress?: string | null
  location?: { lat(): number; lng(): number } | null
  types?: string[] | null
  websiteURI?: string | null
  nationalPhoneNumber?: string | null
  regularOpeningHours?: { weekdayDescriptions?: string[] | null } | null
  rating?: number | null
  userRatingCount?: number | null
  googleMapsURI?: string | null
}

const GOOGLE_PLACE_TYPE_MAPPINGS: Array<{
  matches: string[]
  locationType: LocationType
}> = [
  {
    matches: ['veterinary_care'],
    locationType: LocationType.VETERINARIAN,
  },
  {
    matches: ['pet_groomer'],
    locationType: LocationType.GROOMER,
  },
  {
    matches: ['dog_trainer', 'training_center'],
    locationType: LocationType.TRAINING_CENTER,
  },
  {
    matches: ['dog_park', 'park'],
    locationType: LocationType.PARK,
  },
  {
    matches: ['pet_store', 'store', 'shopping_mall'],
    locationType: LocationType.STORE,
  },
  {
    matches: ['cafe', 'coffee_shop', 'bakery'],
    locationType: LocationType.CAFE,
  },
  {
    matches: ['bar', 'pub', 'night_club'],
    locationType: LocationType.BAR,
  },
  {
    matches: ['restaurant', 'meal_takeaway', 'meal_delivery'],
    locationType: LocationType.RESTAURANT,
  },
  {
    matches: ['lodging', 'resort_hotel', 'rv_park'],
    locationType: LocationType.HOTEL,
  },
  {
    matches: ['beach'],
    locationType: LocationType.BEACH,
  },
]

export function inferLocationTypeFromGoogleTypes(types: string[] = []): LocationType {
  const normalizedTypes = new Set(types.map((type) => type.toLowerCase()))

  for (const mapping of GOOGLE_PLACE_TYPE_MAPPINGS) {
    if (mapping.matches.some((type) => normalizedTypes.has(type))) {
      return mapping.locationType
    }
  }

  return LocationType.OTHER
}

export function formatGooglePlaceHours(openingHours?: string[]): string | undefined {
  const normalizedHours = openingHours?.map((line) => line.trim()).filter(Boolean)

  if (!normalizedHours?.length) {
    return undefined
  }

  return normalizedHours.join(' • ')
}

export function buildLocationInputFromGooglePlace(place: GooglePlaceDetails): CreateLocationInput {
  return {
    googlePlaceId: place.placeId,
    name: place.name,
    type: inferLocationTypeFromGoogleTypes(place.types),
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    website: place.website,
    phone: place.phone,
    hours: formatGooglePlaceHours(place.openingHours),
  }
}

export function placeToGooglePlaceDetails(
  place: FetchedPlaceData,
  fallbackPlaceId = ''
): GooglePlaceDetails | null {
  const location = place.location
  if (!location) return null

  return {
    placeId: place.id || fallbackPlaceId,
    name: place.displayName || place.formattedAddress || 'Untitled place',
    address: place.formattedAddress || 'Address unavailable',
    latitude: location.lat(),
    longitude: location.lng(),
    website: place.websiteURI || undefined,
    phone: place.nationalPhoneNumber || undefined,
    rating: place.rating || undefined,
    userRatingCount: place.userRatingCount || undefined,
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.length
      ? place.regularOpeningHours.weekdayDescriptions
      : undefined,
    googleMapsUrl: place.googleMapsURI || undefined,
    types: place.types ?? [],
  }
}

/** Lets a saved location reuse the map preview card; identity lives in selectedSavedLocation. */
export function locationToPlaceDetails(location: Location): GooglePlaceDetails {
  return {
    placeId: location.googlePlaceId ?? '',
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    website: location.website,
    phone: location.phone,
    types: [],
  }
}
