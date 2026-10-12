export const INSTAGRAM_HANDLE_MAX_LENGTH = 30

export type InstagramHandleResult = { ok: true; value: string | null } | { ok: false }

/**
 * Normalises an Instagram handle (trim, strip a leading @, lowercase). Empty input yields
 * `null` (clear the handle); anything that isn't a valid Instagram username is rejected.
 */
export function parseInstagramHandle(input: unknown): InstagramHandleResult {
  if (input === null || input === undefined) return { ok: true, value: null }
  if (typeof input !== 'string') return { ok: false }

  const handle = input.trim().replace(/^@/, '').trim().toLowerCase()
  if (handle === '') return { ok: true, value: null }

  const valid =
    handle.length <= INSTAGRAM_HANDLE_MAX_LENGTH &&
    /^[a-z0-9._]+$/.test(handle) &&
    !handle.startsWith('.') &&
    !handle.endsWith('.') &&
    !handle.includes('..')

  return valid ? { ok: true, value: handle } : { ok: false }
}

export function instagramProfileUrl(handle: string): string {
  return `https://instagram.com/${encodeURIComponent(handle)}`
}
