export default defineEventHandler(async (event) => {
  const { id } = await requireDbUser(event)

  // Get database user with related data
  const dbUser = await prisma.user.findUnique({
    where: { id },
    include: {
      locations: {
        include: LOCATION_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      },
      reviews: {
        include: {
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!dbUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  // Calculate average ratings for locations
  const locationsWithRating = dbUser.locations.map(withAverageRating)

  return {
    user: toOwnProfile(dbUser),
    locations: locationsWithRating,
    reviews: dbUser.reviews,
  }
})
