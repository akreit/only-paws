export default defineEventHandler(async (event) => {
  const existing = await requireDbUser(event)
  const body = await readBody(event)
  const { url, publicId } = body ?? {}

  const cloudName = useRuntimeConfig(event).public.cloudinaryCloudName
  if (!cloudName) {
    throw createError({ statusCode: 500, message: 'Image hosting is not configured' })
  }

  if (!isValidProfilePhoto(url, publicId, cloudName)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid profile photo: expected a JPEG, PNG or WebP image from our image host',
    })
  }

  // The previous Cloudinary asset is not deleted: like photos/[id].delete.ts, the server has no
  // Cloudinary admin integration, so replaced assets are left in the cloud.
  const dbUser = await prisma.user.update({
    where: { id: existing.id },
    data: { profilePhotoUrl: url, profilePhotoPublicId: publicId },
  })

  return toOwnProfile(dbUser)
})
