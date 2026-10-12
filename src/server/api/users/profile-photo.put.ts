const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/
const FORMATS = ['jpg', 'png', 'webp']

export default defineEventHandler(async (event) => {
  const existing = await requireDbUser(event)
  const body = await readBody(event)
  const { publicId, format: rawFormat } = body ?? {}

  const cloudName = useRuntimeConfig(event).public.cloudinaryCloudName
  if (!cloudName) {
    throw createError({ statusCode: 500, message: 'Image hosting is not configured' })
  }

  const format =
    typeof rawFormat === 'string' ? rawFormat.toLowerCase().replace(/^jpeg$/, 'jpg') : ''
  if (!FORMATS.includes(format)) {
    throw createError({ statusCode: 400, message: 'Invalid profile photo: unsupported format' })
  }

  if (
    typeof publicId !== 'string' ||
    publicId.length > 255 ||
    !PUBLIC_ID_PATTERN.test(publicId) ||
    publicId.split('/').includes('..')
  ) {
    throw createError({ statusCode: 400, message: 'Invalid profile photo: bad public id' })
  }

  // Uploads are folder-scoped per user, so a user can only claim their own assets
  if (!publicId.startsWith(`only-paws/users/${existing.id}/`)) {
    throw createError({ statusCode: 400, message: 'Invalid profile photo: wrong folder' })
  }

  // The URL is built here, never taken from the client (it could carry transformations)
  const url = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.${format}`

  // The previous Cloudinary asset is not deleted: like photos/[id].delete.ts, the server has no
  // Cloudinary admin integration, so replaced assets are left in the cloud.
  const dbUser = await prisma.user.update({
    where: { id: existing.id },
    data: { profilePhotoUrl: url, profilePhotoPublicId: publicId },
  })

  return toCurrentUser(dbUser)
})
