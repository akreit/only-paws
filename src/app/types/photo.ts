import type { PublicUser } from './user'
import type { Comment } from './comment'

export interface Photo {
  id: string
  url: string
  caption?: string
  publicId: string
  locationId: string
  uploaderId: string
  uploader?: PublicUser
  createdAt: Date
  comments?: Comment[]
}

export interface CreatePhotoInput {
  url: string
  caption?: string
  publicId: string
  locationId: string
}

export interface CloudinaryUploadResult {
  url: string
  publicId: string
  format?: string
  width: number
  height: number
}
