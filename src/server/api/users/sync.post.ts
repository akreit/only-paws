export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)
  const body = await readBody(event)
  const { email, username, avatarUrl } = body ?? {}

  // The authenticated Clerk id is the only identity; any clerkUserId in the body is ignored
  const user = await withDatabaseErrorHandling(() =>
    prisma.user.upsert({
      where: { clerkUserId },
      update: {
        email,
        username,
        avatarUrl,
      },
      create: {
        clerkUserId,
        email,
        username,
        avatarUrl,
      },
    })
  )

  return user
})
