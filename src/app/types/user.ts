export interface User {
  id: string
  clerkUserId: string
  email?: string
  username?: string
  bio?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface UpdateUserInput {
  username?: string
  bio?: string
  avatarUrl?: string
}
