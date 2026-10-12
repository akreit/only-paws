export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

  const location = await withDatabaseErrorHandling(() =>
    prisma.location.findUnique({
      where: { id },
      include: LOCATION_DETAIL_INCLUDE,
    })
  )

  if (!location) {
    throw createError({
      statusCode: 404,
      message: 'Location not found',
    })
  }

  return withAverageRating(location)
})
