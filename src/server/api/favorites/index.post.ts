export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)

  const body = await readBody(event)
  const locationId = body?.locationId

  if (typeof locationId !== 'string' || !locationId.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

  const location = await withDatabaseErrorHandling(() =>
    prisma.location.findUnique({ where: { id: locationId }, select: { id: true } })
  )

  if (!location) {
    throw createError({
      statusCode: 404,
      message: 'Location not found',
    })
  }

  // Create or get existing favorite
  return withDatabaseErrorHandling(() =>
    prisma.favorite.upsert({
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
  )
})
