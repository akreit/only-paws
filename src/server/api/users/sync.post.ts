export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { clerkUserId, email, username, avatarUrl } = body

  if (!clerkUserId) {
    throw createError({
      statusCode: 400,
      message: 'Clerk user ID is required',
    })
  }

  // Find or create user
  const user = await prisma.user.upsert({
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

  return user
})

