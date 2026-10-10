export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)

  const favorites = await withDatabaseErrorHandling(() =>
    prisma.favorite.findMany({
      where: { userId: dbUser.id },
      include: {
        location: {
          include: {
            photos: {
              take: 1,
              orderBy: { createdAt: 'desc' },
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
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  )

  // Same location shape as GET /api/locations
  return favorites.map(({ locationId, location }) => {
    const reviews = location.reviews ?? []
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0

    return {
      locationId,
      location: { ...location, averageRating },
    }
  })
})
