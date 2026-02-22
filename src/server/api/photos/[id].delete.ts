export default defineEventHandler(async (event) => {
  const clerkUserId = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Photo ID is required',
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

  // Get photo
  const photo = await prisma.photo.findUnique({
    where: { id },
  })

  if (!photo) {
    throw createError({
      statusCode: 404,
      message: 'Photo not found',
    })
  }

  // Check if user is the uploader
  if (photo.uploaderId !== dbUser.id) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden',
    })
  }

  // Delete photo from database
  await prisma.photo.delete({
    where: { id },
  })

  // Note: Cloudinary deletion should be handled client-side or via webhook
  // For now, we just delete from DB

  return { success: true }
})

