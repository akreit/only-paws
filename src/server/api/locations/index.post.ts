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
  const { name, type, description, address, latitude, longitude, website, phone, hours, leashRequired, breedRestrictions, offLeashArea, amenities } = body

  // Validate required fields
  if (!name || !type || !address || latitude === undefined || longitude === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    })
  }

  // Create location
  const location = await prisma.location.create({
    data: {
      name,
      type,
      description,
      address,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      website,
      phone,
      hours,
      leashRequired,
      breedRestrictions,
      offLeashArea,
      amenities: amenities ? JSON.stringify(amenities) : null,
      createdById: dbUser.id,
    },
    include: {
      photos: true,
      reviews: {
        include: {
          author: true,
        },
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

  return location
})

