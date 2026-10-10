export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)
  const locationId = getRouterParam(event, 'locationId')

  if (!locationId) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

  // Only ever deletes the current user's favorite
  await withDatabaseErrorHandling(() =>
    prisma.favorite.deleteMany({
      where: {
        userId: dbUser.id,
        locationId,
      },
    })
  )

  return { success: true }
})
