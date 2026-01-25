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

export interface UpdateReviewInput {
  id: string
  rating?: number
  comment?: string
}

