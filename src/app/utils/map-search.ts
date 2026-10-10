import type { GooglePlaceDetails, Location, LocationType } from '~/types'

export const MAX_SAVED_RESULTS = 5
export const MAX_GOOGLE_RESULTS = 5
export const MIN_SEARCH_LENGTH = 2

export interface PlaceSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
}

/** Subset of a fetched `google.maps.places.Place` needed to build a preview. */
export interface FetchedPlaceData {
  id?: string | null
  displayName?: string | null
  formattedAddress?: string | null
  location?: { lat(): number; lng(): number } | null
  types?: string[] | null
}

export type SearchResultItem =
  | {
      kind: 'saved'
      key: string
      label: string
      description: string
      locationType: LocationType
      location: Location
    }
  | { kind: 'google'; key: string; label: string; description: string; suggestion: PlaceSuggestion }

export interface SearchResultGroup {
  id: 'saved' | 'google'
  title: string
  items: SearchResultItem[]
}

export interface SearchDropdownModel {
  groups: SearchResultGroup[]
  /** Selectable items in display order; indexes match keyboard navigation. */
  flat: SearchResultItem[]
}

export function isSearchableQuery(query: string): boolean {
  return query.trim().length >= MIN_SEARCH_LENGTH
}

export function buildSearchDropdown(
  saved: Location[],
  suggestions: PlaceSuggestion[],
  limits: { saved?: number; google?: number } = {}
): SearchDropdownModel {
  const savedLimit = limits.saved ?? MAX_SAVED_RESULTS
  const googleLimit = limits.google ?? MAX_GOOGLE_RESULTS

  // Compare against all saved results, not just the visible ones, so a hidden duplicate can't leak in
  const savedPlaceIds = new Set(saved.map((l) => l.googlePlaceId).filter(Boolean))

  const savedItems: SearchResultItem[] = saved.slice(0, savedLimit).map((location) => ({
    kind: 'saved',
    key: `saved:${location.id}`,
    label: location.name,
    description: location.address,
    locationType: location.type,
    location,
  }))

  const seen = new Set<string>()
  const googleItems: SearchResultItem[] = []
  for (const suggestion of suggestions) {
    if (googleItems.length >= googleLimit) break
    if (savedPlaceIds.has(suggestion.placeId) || seen.has(suggestion.placeId)) continue
    seen.add(suggestion.placeId)
    googleItems.push({
      kind: 'google',
      key: `google:${suggestion.placeId}`,
      label: suggestion.mainText,
      description: suggestion.secondaryText,
      suggestion,
    })
  }

  const groups: SearchResultGroup[] = []
  if (savedItems.length) groups.push({ id: 'saved', title: 'Saved places', items: savedItems })
  if (googleItems.length) groups.push({ id: 'google', title: 'Google Maps', items: googleItems })

  return { groups, flat: groups.flatMap((g) => g.items) }
}

/** Moves the active index by one with wrap-around; -1 means nothing is active. */
export function moveActiveIndex(current: number, direction: 1 | -1, count: number): number {
  if (count <= 0) return -1
  if (current < 0 || current >= count) return direction === 1 ? 0 : count - 1
  return (current + direction + count) % count
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
    types: place.types ?? [],
  }
}

/** Lets a saved location reuse the map preview card. */
export function locationToPlaceDetails(location: Location): GooglePlaceDetails {
  return {
    placeId: location.googlePlaceId || location.id,
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    website: location.website,
    phone: location.phone,
    types: [],
  }
}
