/**
 * Fields of a user that may be shown to other people. Never add email, clerkUserId
 * or location fields here; use it as `select: PUBLIC_USER_SELECT` for any user relation.
 */
export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  avatarUrl: true,
  bio: true,
  homeCity: true,
  hasDog: true,
  dogName: true,
  dogBreed: true,
  lookingFor: true,
} as const
