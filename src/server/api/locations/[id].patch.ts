export default defineEventHandler(async (event) => {
  await requireDbUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

  const parsed = parseLocationUpdate(await readBody(event))

  if ('error' in parsed) {
    throw createError({
      statusCode: 400,
      message: parsed.error,
    })
  }

  const location = await withDatabaseErrorHandling(async () => {
    const existing = await prisma.location.findUnique({ where: { id } })

    if (!existing) {
      return null
    }

    return prisma.location.update({
      where: { id },
      data: parsed.data,
      include: LOCATION_DETAIL_INCLUDE,
    })
  })

  if (!location) {
    throw createError({
      statusCode: 404,
      message: 'Location not found',
    })
  }

  return withAverageRating(location)
})
