export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Review ID is required',
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

  // Get review
  const review = await prisma.review.findUnique({
    where: { id },
  })

  if (!review) {
    throw createError({
      statusCode: 404,
      message: 'Review not found',
    })
  }

  // Check if user is the author
  if (review.authorId !== dbUser.id) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden',
    })
  }

  // Delete review
  await prisma.review.delete({
    where: { id },
  })

  return { success: true }
})
