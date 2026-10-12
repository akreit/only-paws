/**
 * Minimal fields of a user that may be shown to others wherever a user is embedded
 * (review authors, photo uploaders, commenters). Never add email, clerkUserId, location
 * or profile details here: those users may not have opted in to "Meet people".
 */
export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  avatarUrl: true,
} as const

/** Profile fields shown on "Meet people" cards; only for discoverable users (GET /api/people). */
export const PEOPLE_CARD_SELECT = {
  ...PUBLIC_USER_SELECT,
  bio: true,
  homeCity: true,
  hasDog: true,
  dogName: true,
  dogBreed: true,
  lookingFor: true,
} as const
