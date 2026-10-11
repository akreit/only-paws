export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Review ID is required',
    })
  }

  const review = await withDatabaseErrorHandling(() => prisma.review.findUnique({ where: { id } }))

  if (!review) {
    throw createError({
      statusCode: 404,
      message: 'Review not found',
    })
  }

  // Only the author may edit a review
  if (review.authorId !== dbUser.id) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden',
    })
  }

  const parsed = parseReviewUpdate(await readBody(event))

  if ('error' in parsed) {
    throw createError({
      statusCode: 400,
      message: parsed.error,
    })
  }

  return withDatabaseErrorHandling(() =>
    prisma.review.update({
      where: { id },
      data: parsed.data,
      include: {
        author: true,
      },
    })
  )
})
