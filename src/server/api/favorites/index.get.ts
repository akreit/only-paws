export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)

  // Get database user
  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId },
  })

  if (!dbUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  // Get user's favorites
  const favorites = await prisma.favorite.findMany({
    where: { userId: dbUser.id },
    select: { locationId: true },
  })

  return favorites
})
