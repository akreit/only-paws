import { LocationType } from '@prisma/client'

const LOCATION_TYPES: string[] = Object.values(LocationType)

export const MAX_BREED_RESTRICTIONS_LENGTH = 500

/** The only fields a place may change after creation; everything else stays immutable. */
const EDITABLE_FIELDS = ['type', 'leashRequired', 'offLeashArea', 'breedRestrictions', 'amenities']

export interface LocationUpdateData {
  type?: LocationType
  leashRequired?: boolean | null
  offLeashArea?: boolean | null
  breedRestrictions?: string | null
  /** JSON-encoded string array, as stored in the database */
  amenities?: string | null
}

export type LocationUpdateResult = { data: LocationUpdateData } | { error: string }

/** Validates a PATCH /api/locations/[id] body without touching the database. */
export function parseLocationUpdate(body: unknown): LocationUpdateResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid input' }
  }

  const input = body as Record<string, unknown>
  const unknownFields = Object.keys(input).filter((key) => !EDITABLE_FIELDS.includes(key))
  if (unknownFields.length > 0) {
    return { error: `Fields cannot be updated: ${unknownFields.join(', ')}` }
  }

  const data: LocationUpdateData = {}

  if (input.type !== undefined) {
    if (!LOCATION_TYPES.includes(input.type as string)) {
      return { error: 'Invalid location type' }
    }
    data.type = input.type as LocationType
  }

  for (const field of ['leashRequired', 'offLeashArea'] as const) {
    const value = input[field]
    if (value === undefined) continue
    if (value !== null && typeof value !== 'boolean') {
      return { error: `${field} must be a boolean or null` }
    }
    data[field] = value
  }

  if (input.breedRestrictions !== undefined) {
    const value = input.breedRestrictions
    if (value !== null && typeof value !== 'string') {
      return { error: 'breedRestrictions must be a string or null' }
    }
    const trimmed = value?.trim() ?? ''
    if (trimmed.length > MAX_BREED_RESTRICTIONS_LENGTH) {
      return {
        error: `breedRestrictions must be at most ${MAX_BREED_RESTRICTIONS_LENGTH} characters`,
      }
    }
    data.breedRestrictions = trimmed || null
  }

  if (input.amenities !== undefined) {
    const value = input.amenities
    if (value === null) {
      data.amenities = null
    } else {
      if (!Array.isArray(value) || !value.every((a) => AMENITIES_OPTIONS.includes(a))) {
        return { error: 'amenities must be an array of known amenities or null' }
      }
      data.amenities = JSON.stringify([...new Set<string>(value)])
    }
  }

  if (Object.keys(data).length === 0) {
    return { error: 'At least one field to update is required' }
  }

  return { data }
}
