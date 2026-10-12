import type { User } from '@prisma/client'

/**
 * Shape of the signed-in user's own row sent to the client. Exposes whether an approximate
 * location is set, but never the stored coordinates.
 */
export function toCurrentUser(dbUser: User) {
  return {
    id: dbUser.id,
    clerkUserId: dbUser.clerkUserId,
    email: dbUser.email,
    username: dbUser.username,
    bio: dbUser.bio,
    avatarUrl: dbUser.avatarUrl,
    homeCity: dbUser.homeCity,
    hasDog: dbUser.hasDog,
    dogName: dbUser.dogName,
    dogBreed: dbUser.dogBreed,
    lookingFor: dbUser.lookingFor,
    discoverable: dbUser.discoverable,
    hasApproxLocation: dbUser.approxLatitude != null && dbUser.approxLongitude != null,
    approxLocationUpdatedAt: dbUser.approxLocationUpdatedAt,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  }
}
