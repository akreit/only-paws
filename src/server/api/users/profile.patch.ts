import { validateProfileUpdate } from '../../../app/utils/profile'

export default defineEventHandler(async (event) => {
  const existing = await requireDbUser(event)
  const body = await readBody(event)

  const { valid, data, errors } = validateProfileUpdate(body)
  if (!valid) {
    throw createError({
      statusCode: 400,
      message: `Invalid profile: ${errors.map((e) => e.message).join('; ')}`,
    })
  }

  // A user without a dog can't gain dog details unless hasDog is switched on in the same request
  if (data.hasDog === undefined && !existing.hasDog) {
    delete data.dogName
    delete data.dogBreed
  }

  const dbUser = await prisma.user.update({
    where: { id: existing.id },
    data,
  })

  // Same shape as the `user` object returned by GET /api/users/profile
  return {
    id: dbUser.id,
    clerkUserId: dbUser.clerkUserId,
    email: dbUser.email,
    username: dbUser.username,
    bio: dbUser.bio,
    avatarUrl: dbUser.avatarUrl,
    homeCity: dbUser.homeCity,
    hasDog: dbUser.hasDog,
    dogName: dbUser.dogName,
    dogBreed: dbUser.dogBreed,
    lookingFor: dbUser.lookingFor,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  }
})
