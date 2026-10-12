import type { PublicUser } from './user'

export interface Comment {
  id: string
  text: string
  photoId: string
  authorId: string
  author?: PublicUser
  createdAt: Date
}

export interface CreateCommentInput {
  text: string
  photoId: string
}
