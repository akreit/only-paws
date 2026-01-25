import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)

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

