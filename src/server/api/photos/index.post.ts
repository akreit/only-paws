export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)

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
