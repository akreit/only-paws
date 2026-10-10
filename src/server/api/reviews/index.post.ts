export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)

  const body = await readBody(event)
  const { rating, comment, locationId } = body

  // Validate required fields
  if (!rating || !locationId || rating < 1 || rating > 5) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
    })
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      rating,
      comment,
      locationId,
      authorId: dbUser.id,
    },
    include: {
      author: true,
    },
  })

  return review
})
