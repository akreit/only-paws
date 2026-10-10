import type { H3Event } from 'h3'

/**
 * Requires an authenticated Clerk user and returns the matching database user,
 * creating a bare row on first contact so routes don't race the client-side
 * `/api/users/sync` call. Email/username/avatar are filled in by that sync.
 */
export async function requireDbUser(event: H3Event) {
  const clerkUserId = await requireAuth(event)

  // Read first; upsert (not create) on a miss so concurrent first requests don't conflict
  return withDatabaseErrorHandling(
    async () =>
      (await prisma.user.findUnique({ where: { clerkUserId } })) ??
      (await prisma.user.upsert({
        where: { clerkUserId },
        update: {},
        create: { clerkUserId },
      }))
  )
}
