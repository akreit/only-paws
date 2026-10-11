export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)

  const body = await readBody(event)
  const { rating, comment, locationId } = body

  // Validate required fields
  if (!validateRating(rating) || typeof locationId !== 'string' || !locationId) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
    })
  }

  // Same rating/comment rules as editing (comment type, length, trimming)
  const parsed = parseReviewUpdate({ rating, comment })
  if ('error' in parsed) {
    throw createError({ statusCode: 400, message: parsed.error })
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      rating,
      comment: parsed.data.comment,
      locationId,
      authorId: dbUser.id,
    },
    include: {
      author: true,
    },
  })

  return review
})
