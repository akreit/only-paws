/** Search radii (km) offered by "Meet people". */
export const PEOPLE_RADII_KM = [2, 5, 10, 25] as const

/** Radius used when none is chosen. */
export const DEFAULT_PEOPLE_RADIUS_KM = 10

/** Coordinates are stored rounded to 0.01° (~1.1 km of latitude) so exact positions are never kept. */
const APPROX_STEP = 0.01

const EARTH_RADIUS_KM = 6371

const DISTANCE_BUCKETS_KM = [1, 2, 3, 5, 10, 15, 25] as const

function roundTo(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 100) / 100
}

export function roundToApprox(latitude: number, longitude: number) {
  return { latitude: roundTo(latitude, APPROX_STEP), longitude: roundTo(longitude, APPROX_STEP) }
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
  const cosLat = Math.max(Math.cos(toRadians(latitude)), 0.01)
  const lngDelta = latDelta / cosLat
  return {
    minLat: Math.max(-90, latitude - latDelta),
    maxLat: Math.min(90, latitude + latDelta),
    minLng: Math.max(-180, longitude - lngDelta),
    maxLng: Math.min(180, longitude + lngDelta),
  }
}
