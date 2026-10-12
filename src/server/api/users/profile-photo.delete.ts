export default defineEventHandler(async (event) => {
  const existing = await requireDbUser(event)

  // Clears the reference only; the Cloudinary asset is left in place (see profile-photo.put.ts)
  const dbUser = await prisma.user.update({
    where: { id: existing.id },
    data: { profilePhotoUrl: null, profilePhotoPublicId: null },
  })

  return toCurrentUser(dbUser)
})
