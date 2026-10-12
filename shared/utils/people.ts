/** Search radii (km) offered by "Meet people". */
export const PEOPLE_RADII_KM = [2, 5, 10, 25] as const

/** Radius used when none is chosen. */
export const DEFAULT_PEOPLE_RADIUS_KM = 10

/** Looking-for tags a person can pick; mirrors the `LookingFor` enum in the Prisma schema. */
export const LOOKING_FOR_VALUES = ['FRIENDS', 'PLACES', 'TIPS', 'PLAYDATES'] as const

/**
 * Coordinates are snapped to a grid so exact positions are never kept. The grid step is 0.01°
 * of latitude (~1.1 km). A degree of longitude shrinks with cos(latitude) (about 0.7 km per
 * 0.01° at 50°N), so the longitude step is widened by the same factor to keep cells ~1.1 km
 * wide at every latitude.
 */
const APPROX_STEP = 0.01

/** Floor for cos(latitude) so the longitude step stays finite near the poles. */
const MIN_COS_LAT = 0.01

/** Largest per-user offset (degrees of latitude) added on top of the grid point. */
export const MAX_JITTER_DEG = 0.005

const EARTH_RADIUS_KM = 6371

const DISTANCE_BUCKETS_KM = [1, 2, 3, 5, 10, 15, 25] as const

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50
const MAX_BREED_LENGTH = 50

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Longitude step (degrees) of the grid cell at the given latitude. */
function lngStep(latitude: number): number {
  return APPROX_STEP / Math.max(Math.cos(toRadians(latitude)), MIN_COS_LAT)
}

/** Snaps a point to its grid cell (latitude first, then longitude with a cos(lat)-scaled step). */
export function roundToApprox(latitude: number, longitude: number) {
  const roundedLat = round(Math.round(latitude / APPROX_STEP) * APPROX_STEP, 2)
  const step = lngStep(roundedLat)
  return { latitude: roundedLat, longitude: round(Math.round(longitude / step) * step, 4) }
}

export interface ApproxJitter {
  lat: number
  lng: number
}

/**
 * Random offset within the cell, uniform in ±0.005° of latitude. The longitude offset is scaled
 * by the same cos(lat) factor as the cell step. `random` returns a number in [0, 1).
 */
export function randomJitter(latitude: number, random: () => number = Math.random): ApproxJitter {
  const offset = () => (random() * 2 - 1) * MAX_JITTER_DEG
  return { lat: offset(), lng: (offset() * lngStep(latitude)) / APPROX_STEP }
}

/** Grid cell plus the user's fixed jitter, clamped to valid ranges and rounded to 4 decimals. */
export function approximateLocation(latitude: number, longitude: number, jitter: ApproxJitter) {
  const cell = roundToApprox(latitude, longitude)
  return {
    latitude: round(Math.min(90, Math.max(-90, cell.latitude + jitter.lat)), 4),
    longitude: round(Math.min(180, Math.max(-180, cell.longitude + jitter.lng)), 4),
  }
}

export interface PeopleQuery {
  radius: number
  page: number
  pageSize: number
  breed: string
  lookingFor: (typeof LOOKING_FOR_VALUES)[number][]
  hasDog: boolean
}

function single(value: unknown): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first : undefined
}

function parseInteger(raw: string | undefined, fallback: number, max?: number): number | null {
  if (raw === undefined || raw === '') return fallback
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) return null
  return parsed
}

/** Validates the search query string of `GET /api/people`. */
export function parsePeopleQuery(
  query: Record<string, unknown>
): { ok: true; value: PeopleQuery } | { ok: false; error: string } {
  const radius = parseInteger(single(query.radius), DEFAULT_PEOPLE_RADIUS_KM)
  if (radius === null) return { ok: false, error: 'Invalid radius' }
  if (!(PEOPLE_RADII_KM as readonly number[]).includes(radius)) {
    return { ok: false, error: `Invalid radius; use one of ${PEOPLE_RADII_KM.join(', ')} km` }
  }

  const page = parseInteger(single(query.page), 1)
  if (page === null) return { ok: false, error: 'Invalid page' }
  const pageSize = parseInteger(single(query.pageSize), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  if (pageSize === null) return { ok: false, error: 'Invalid pageSize' }

  const breed = single(query.breed)?.trim() ?? ''
  if (breed.length > MAX_BREED_LENGTH) {
    return { ok: false, error: `Breed must be at most ${MAX_BREED_LENGTH} characters` }
  }

  const lookingFor = (single(query.lookingFor) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (!lookingFor.every((value) => (LOOKING_FOR_VALUES as readonly string[]).includes(value))) {
    return { ok: false, error: 'Invalid lookingFor value' }
  }

  return {
    ok: true,
    value: {
      radius,
      page,
      pageSize,
      breed,
      lookingFor: lookingFor as PeopleQuery['lookingFor'],
      hasDog: single(query.hasDog) === 'true',
    },
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Upper limit (km) of the coarse bucket a distance falls into; Infinity beyond the last bucket. */
export function distanceBucketKm(km: number): number {
  return DISTANCE_BUCKETS_KM.find((limit) => km <= limit) ?? Infinity
}

/** Rounds a distance up to a coarse bucket label; never a precise value. */
export function bucketDistance(km: number): string {
  const bucket = distanceBucketKm(km)
  if (bucket === Infinity) return `> ${DISTANCE_BUCKETS_KM[DISTANCE_BUCKETS_KM.length - 1]} km`
  return bucket === 1 ? '< 1 km' : `~${bucket} km`
}

/** Lat/lng rectangle that fully contains the circle of `km` around the point. */
export function boundingBox(latitude: number, longitude: number, km: number) {
  const latDelta = (km / EARTH_RADIUS_KM) * (180 / Math.PI)
  const cosLat = Math.max(Math.cos(toRadians(latitude)), MIN_COS_LAT)
  const lngDelta = latDelta / cosLat
  return {
    minLat: Math.max(-90, latitude - latDelta),
    maxLat: Math.min(90, latitude + latDelta),
    minLng: Math.max(-180, longitude - lngDelta),
    maxLng: Math.min(180, longitude + lngDelta),
  }
}
