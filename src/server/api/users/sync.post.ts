import { clerkClient } from '@clerk/nuxt/server'

export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)

  // Profile fields come from Clerk, never from the request body
  let clerkUser
  try {
    clerkUser = await clerkClient(event).users.getUser(clerkUserId)
  } catch (error) {
    console.error('Failed to load user from Clerk:', error)
    throw createError({
      statusCode: 502,
      message: 'Failed to load user from Clerk',
    })
  }

  const profile = {
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    username: clerkUser.username ?? null,
    avatarUrl: clerkUser.imageUrl ?? null,
  }

  const dbUser = await withDatabaseErrorHandling(() =>
    prisma.user.upsert({
      where: { clerkUserId },
      update: profile,
      create: { clerkUserId, ...profile },
    })
  )

  return toCurrentUser(dbUser)
})
