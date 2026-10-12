import type { User } from './user'

export interface Review {
  id: string
  rating: number
  comment?: string
  locationId: string
  authorId: string
  author?: User
  createdAt: Date
  updatedAt: Date
}

export interface CreateReviewInput {
  rating: number
  comment?: string
  locationId: string
}

/** Fields editable through PATCH /api/reviews/[id]; an empty comment is stored as null. */
export interface UpdateReviewInput {
  rating?: number
  comment?: string | null
}
