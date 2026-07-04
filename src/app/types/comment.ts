import type { User } from './user'

export interface Comment {
  id: string
  text: string
  photoId: string
  authorId: string
  author?: User
  createdAt: Date
}

export interface CreateCommentInput {
  text: string
  photoId: string
}
