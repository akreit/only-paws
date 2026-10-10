import type { Location, LocationType } from '~/types'

export const MAX_SAVED_RESULTS = 5
export const MAX_GOOGLE_RESULTS = 5
export const MIN_SEARCH_LENGTH = 2

export interface PlaceSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
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
  suggestions: PlaceSuggestion[]
): SearchDropdownModel {
  // Compare against all saved results, not just the visible ones, so a hidden duplicate can't leak in
  const savedPlaceIds = new Set(saved.map((l) => l.googlePlaceId).filter(Boolean))

  const savedItems: SearchResultItem[] = saved.slice(0, MAX_SAVED_RESULTS).map((location) => ({
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
    if (googleItems.length >= MAX_GOOGLE_RESULTS) break
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
