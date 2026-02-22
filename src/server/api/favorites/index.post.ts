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

  const body = await readBody(event)
  const { locationId } = body

  if (!locationId) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

  // Create or get existing favorite
  const favorite = await prisma.favorite.upsert({
    where: {
      userId_locationId: {
        userId: dbUser.id,
        locationId,
      },
    },
    create: {
      userId: dbUser.id,
      locationId,
    },
    update: {},
  })

  return favorite
})
