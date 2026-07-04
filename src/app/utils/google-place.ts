import { LocationType, type CreateLocationInput, type GooglePlaceDetails } from '~/types'

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
