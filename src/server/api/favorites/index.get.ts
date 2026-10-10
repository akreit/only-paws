export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)

  const favorites = await withDatabaseErrorHandling(() =>
    prisma.favorite.findMany({
      where: { userId: dbUser.id },
      include: {
        location: {
          include: LOCATION_LIST_INCLUDE,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  )

  // Same location shape as GET /api/locations
  return favorites.map(({ locationId, location }) => ({
    locationId,
    location: withAverageRating(location),
  }))
})
