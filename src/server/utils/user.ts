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

/**
 * The only user fields that may appear on public data (review authors, photo uploaders,
 * commenters). Always use this instead of `include: { author: true }`, which would leak
 * `email` and `clerkUserId`.
 */
export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  avatarUrl: true,
  profilePhotoUrl: true,
} as const

type OwnProfileSource = {
  id: string
  clerkUserId: string
  email: string | null
  username: string | null
  bio: string | null
  avatarUrl: string | null
  homeCity: string | null
  hasDog: boolean
  dogName: string | null
  dogBreed: string | null
  lookingFor: string[]
  createdAt: Date
  updatedAt: Date
  instagramHandle: string | null
  profilePhotoUrl: string | null
  profilePhotoPublicId: string | null
}

/** The signed-in user's own profile (includes email/clerkUserId, so never return it publicly). */
export function toOwnProfile(user: OwnProfileSource) {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    homeCity: user.homeCity,
    hasDog: user.hasDog,
    dogName: user.dogName,
    dogBreed: user.dogBreed,
    lookingFor: user.lookingFor,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    instagramHandle: user.instagramHandle,
    profilePhotoUrl: user.profilePhotoUrl,
    profilePhotoPublicId: user.profilePhotoPublicId,
  }
}
