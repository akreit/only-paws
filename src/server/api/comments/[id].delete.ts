import prisma from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Comment ID is required',
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

