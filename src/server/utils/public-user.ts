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

/** Public fields plus the profile details shown on a people card. Never includes contact info. */
export const PEOPLE_CARD_SELECT = {
  ...PUBLIC_USER_SELECT,
  bio: true,
  homeCity: true,
  hasDog: true,
  dogName: true,
  dogBreed: true,
  lookingFor: true,
} as const
