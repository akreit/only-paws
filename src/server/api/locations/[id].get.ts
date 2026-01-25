import prisma from '~/../server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Location ID is required',
    })
  }

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      photos: {
        include: {
          uploader: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      reviews: {
        include: {
          author: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          reviews: true,
          photos: true,
          favorites: true,
        },
      },
    },
  })

  if (!location) {
    throw createError({
      statusCode: 404,
      message: 'Location not found',
    })
  }

  // Calculate average rating
  const reviews = location.reviews || []
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0

  return {
    ...location,
    averageRating,
  }
})

