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
  const { text, photoId } = body

  if (!text || !photoId) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    })
  }

  // Create comment
  const comment = await prisma.comment.create({
    data: {
      text,
      photoId,
      authorId: dbUser.id,
    },
    include: {
      author: true,
    },
  })

  return comment
})

