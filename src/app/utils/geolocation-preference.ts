// Remembers whether we already asked for location and the last known fix, so the site asks once
// and the map can start centered on the user. Stored in localStorage under a single key.
const STORAGE_KEY = 'only-paws:geolocation:v1'
export const LAST_POSITION_MAX_AGE_MS = 24 * 60 * 60 * 1000

export type PermissionStateLike = 'granted' | 'denied' | 'prompt' | 'unknown'

export interface StoredPosition {
  lat: number
  lng: number
  at: number
}

interface Preference {
  asked: boolean
  lastPosition: StoredPosition | null
}

// Fallback when localStorage is unavailable (SSR, privacy modes); covers this page load
let memory: Preference = { asked: false, lastPosition: null }

function isStoredPosition(value: unknown): value is StoredPosition {
  const p = value as Partial<StoredPosition> | null
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Number.isFinite(p.at) &&
    Math.abs(p.lat as number) <= 90 &&
    Math.abs(p.lng as number) <= 180
  )
}

function read(): Preference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return memory
    const parsed = JSON.parse(raw) as Partial<Preference> | null
    return {
      asked: parsed?.asked === true,
      lastPosition: isStoredPosition(parsed?.lastPosition) ? parsed.lastPosition : null,
    }
  } catch {
    return memory
  }
}

function write(next: Preference): void {
  memory = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // the module variable still covers this page load
  }
}

export function hasAskedForLocation(): boolean {
  return read().asked
}

export function markAskedForLocation(): void {
  write({ ...read(), asked: true })
}

// 3 decimals is ~110 m: plenty for centering a map, without keeping a precise location at rest
const round = (degrees: number) => Math.round(degrees * 1e3) / 1e3

export function saveLastPosition(position: { lat: number; lng: number }): void {
  write({
    ...read(),
    lastPosition: { lat: round(position.lat), lng: round(position.lng), at: Date.now() },
  })
}

/** Forget the stored position (keeps the ask flag), e.g. on sign-out or a denied permission. */
export function clearLastPosition(): void {
  write({ ...read(), lastPosition: null })
}

/** The last known position if it is recent enough, otherwise null. */
export function getLastPosition(maxAgeMs = LAST_POSITION_MAX_AGE_MS): StoredPosition | null {
  const { lastPosition } = read()
  if (!lastPosition) return null
  const age = Date.now() - lastPosition.at
  return age >= 0 && age < maxAgeMs ? lastPosition : null
}

/**
 * Whether to request a fix without a user gesture. Granted: silently. Denied: never.
 * Prompt / unknown (no Permissions API): only if we never auto-asked before.
 */
export function shouldAutoLocate(state: PermissionStateLike, alreadyAsked: boolean): boolean {
  if (state === 'granted') return true
  if (state === 'denied') return false
  return !alreadyAsked
}

/** Permission state via the Permissions API; 'unknown' when it is missing or rejects. */
export async function queryGeolocationPermission(): Promise<PermissionStateLike> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  } catch {
    return 'unknown'
  }
}

/** Approximate distance in meters (equirectangular; fine for short distances). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const rad = Math.PI / 180
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad)
  const y = (b.lat - a.lat) * rad
  return Math.hypot(x, y) * 6371000
}
