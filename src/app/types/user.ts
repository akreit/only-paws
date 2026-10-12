import { LOOKING_FOR_VALUES } from '../../../shared/utils/people'

export { LOOKING_FOR_VALUES }

export type LookingFor = (typeof LOOKING_FOR_VALUES)[number]

export const LOOKING_FOR_LABELS: Record<LookingFor, string> = {
  FRIENDS: '🤝 Friends',
  PLACES: '📍 Places',
  TIPS: '💡 Tips',
  PLAYDATES: '🐕 Playdates',
}

export interface User {
  id: string
  clerkUserId: string
  email?: string
  username?: string
  bio?: string | null
  avatarUrl?: string
  homeCity?: string | null
  hasDog?: boolean
  dogName?: string | null
  dogBreed?: string | null
  lookingFor?: LookingFor[]
  instagramHandle?: string | null
  profilePhotoUrl?: string | null
  /** Only present on the signed-in user's own profile */
  profilePhotoPublicId?: string | null
  /** Opted in to "Meet people"; coordinates are never sent to the client */
  discoverable?: boolean
  hasApproxLocation?: boolean
  approxLocationUpdatedAt?: string | Date | null
  createdAt: Date
  updatedAt: Date
}

/** The minimal subset of a user that is safe to show to others (author, uploader). */
export type PublicUser = Pick<User, 'id' | 'username' | 'avatarUrl' | 'profilePhotoUrl'>

/** Profile fields shown on "Meet people" cards (discoverable users only). */
export type PeopleCardUser = PublicUser &
  Pick<User, 'bio' | 'homeCity' | 'hasDog' | 'dogName' | 'dogBreed' | 'lookingFor'>

export interface UpdateUserInput {
  username?: string
  bio?: string | null
  avatarUrl?: string
  homeCity?: string | null
  hasDog?: boolean
  dogName?: string | null
  dogBreed?: string | null
  lookingFor?: LookingFor[]
}

/** Fields editable through PATCH /api/users/profile */
export interface ProfileUpdateInput {
  bio?: string | null
  homeCity?: string | null
  hasDog?: boolean
  dogName?: string | null
  dogBreed?: string | null
  lookingFor?: LookingFor[]
  instagramHandle?: string | null
}
