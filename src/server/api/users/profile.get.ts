export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)

  // Get database user with related data
  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      locations: {
        include: {
          photos: {
            take: 1,
          },
          reviews: true,
          _count: {
            select: {
              reviews: true,
              photos: true,
              favorites: true,
            },
          },
        },
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
  const locationsWithRating = dbUser.locations.map((location) => {
    const reviews = location.reviews || []
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0

    return {
      ...location,
      averageRating,
    }
  })

  return {
    user: {
      id: dbUser.id,
      clerkUserId: dbUser.clerkUserId,
      email: dbUser.email,
      username: dbUser.username,
      bio: dbUser.bio,
      avatarUrl: dbUser.avatarUrl,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    },
    locations: locationsWithRating,
    reviews: dbUser.reviews,
  }
})

