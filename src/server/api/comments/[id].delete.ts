export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Comment ID is required',
    })
  }

  // Get comment
  const comment = await prisma.comment.findUnique({
    where: { id },
  })

  if (!comment) {
    throw createError({
      statusCode: 404,
      message: 'Comment not found',
    })
  }

  // Check if user is the author
  if (comment.authorId !== dbUser.id) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden',
    })
  }

  // Delete comment
  await prisma.comment.delete({
    where: { id },
  })

  return { success: true }
})
