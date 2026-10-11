import type { LocationQuery, LocationQueryRaw } from 'vue-router'

export const PLACE_QUERY_KEY = 'place'

/** Reads the open stored-place id from the route query (first value when repeated). */
export function parsePlaceQuery(query: LocationQuery): string | null {
  const raw = query[PLACE_QUERY_KEY]
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? value : null
}

/** Copy of the query with `place` set (or removed for null); other params are preserved. */
export function withPlaceQuery(query: LocationQuery, id: string | null): LocationQueryRaw {
  const rest: LocationQueryRaw = Object.fromEntries(
    Object.entries(query).filter(([key]) => key !== PLACE_QUERY_KEY)
  )
  return id ? { ...rest, [PLACE_QUERY_KEY]: id } : rest
}
