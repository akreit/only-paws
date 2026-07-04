import { defineEventHandler, createError, readBody } from 'h3'
import prisma from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

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
  const { url, publicId, locationId, caption } = body

  // Validate required fields
  if (!url || !publicId || !locationId) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    })
  }

  // Create photo
  return await prisma.photo.create({
    data: {
      url,
      publicId,
      locationId,
      caption,
      uploaderId: dbUser.id,
    },
    include: {
      uploader: true,
    },
  })
})
