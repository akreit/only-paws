export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

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

  // Get location
  const location = await prisma.location.findUnique({
    where: { id },
  })

  if (!location) {
    throw createError({
      statusCode: 404,
      message: 'Location not found',
    })
  }

  // Check if user is the creator
  if (location.createdById !== dbUser.id) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden',
    })
  }

  // Delete location
  await prisma.location.delete({
    where: { id },
  })

  return { success: true }
})

