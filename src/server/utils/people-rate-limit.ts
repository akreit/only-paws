import type { H3Event } from 'h3'

/** Searches allowed per user in each fixed window. */
export const PEOPLE_SEARCH_LIMIT = 60
export const PEOPLE_SEARCH_WINDOW_MS = 60 * 60 * 1000

/** Answers 429 with `Retry-After` and `data.retryAt` for a retry time. */
export function throwRateLimited(event: H3Event, message: string, retryAt: Date): never {
  setResponseHeader(
    event,
    'Retry-After',
    Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1000))
  )
  throw createError({ statusCode: 429, message, data: { retryAt: retryAt.toISOString() } })
}

/**
 * Counts one people search for the user in a fixed one-hour window, atomically in the database
 * so concurrent requests cannot exceed the limit. Throws 429 when the window is used up.
 */
export async function enforcePeopleSearchLimit(event: H3Event, userId: string, now = new Date()) {
  const windowStart = new Date(now.getTime() - PEOPLE_SEARCH_WINDOW_MS)

  const incremented = await withDatabaseErrorHandling(() =>
    prisma.user.updateMany({
      where: {
        id: userId,
        peopleSearchWindowStart: { gt: windowStart },
        peopleSearchCount: { lt: PEOPLE_SEARCH_LIMIT },
      },
      data: { peopleSearchCount: { increment: 1 } },
    })
  )
  if (incremented.count > 0) return

  const reset = await withDatabaseErrorHandling(() =>
    prisma.user.updateMany({
      where: {
        id: userId,
        OR: [{ peopleSearchWindowStart: null }, { peopleSearchWindowStart: { lte: windowStart } }],
      },
      data: { peopleSearchCount: 1, peopleSearchWindowStart: now },
    })
  )
  if (reset.count > 0) return

  const user = await withDatabaseErrorHandling(() =>
    prisma.user.findUnique({ where: { id: userId }, select: { peopleSearchWindowStart: true } })
  )
  const start = user?.peopleSearchWindowStart ?? now
  const retryAt = new Date(start.getTime() + PEOPLE_SEARCH_WINDOW_MS)
  throwRateLimited(event, `Too many searches. Try again after ${retryAt.toISOString()}`, retryAt)
}
