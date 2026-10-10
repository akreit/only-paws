// After a write, skip the CDN-cached locations list (s-maxage) so the user sees their change
const CHANGED_AT_KEY = 'only-paws:locations-changed-at'
const BYPASS_WINDOW_MS = 90_000

// Fallback when sessionStorage is unavailable (SSR, privacy modes)
let changedAt = 0

function readStoredChangedAt(): number {
  try {
    return Number(sessionStorage.getItem(CHANGED_AT_KEY)) || 0
  } catch {
    return 0
  }
}

/** Call after any successful write that changes what the locations list shows. */
export function markLocationsChanged(): void {
  changedAt = Date.now()
  try {
    sessionStorage.setItem(CHANGED_AT_KEY, String(changedAt))
  } catch {
    // the module variable still covers this page load
  }
}

/** A unique `fresh` query value while the bypass window is open, otherwise undefined. */
export function locationsCacheBust(): string | undefined {
  const now = Date.now()
  const last = Math.max(changedAt, readStoredChangedAt())
  return now < last + BYPASS_WINDOW_MS ? String(now) : undefined
}
