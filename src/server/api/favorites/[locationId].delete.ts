import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)
  const locationId = getRouterParam(event, 'locationId')

  if (!locationId) {
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

  // Delete favorite
  await prisma.favorite.deleteMany({
    where: {
      userId: dbUser.id,
      locationId,
    },
  })

  return { success: true }
})

