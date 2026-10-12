export default defineEventHandler(async (event) => {
  const dbUser = await requireDbUser(event)

  const locationInclude = {
    photos: true,
    reviews: {
      include: {
        author: { select: PUBLIC_USER_SELECT },
      },
    },
    _count: {
      select: {
        reviews: true,
        photos: true,
        favorites: true,
      },
    },
  }

  const body = await readBody(event)
  const {
    googlePlaceId,
    name,
    type,
    description,
    address,
    latitude,
    longitude,
    website,
    phone,
    hours,
    leashRequired,
    breedRestrictions,
    offLeashArea,
    amenities,
  } = body

  const normalizedGooglePlaceId =
    typeof googlePlaceId === 'string' && googlePlaceId.trim().length > 0
      ? googlePlaceId.trim()
      : undefined

  // Validate required fields
  if (!name || !type || !address || latitude === undefined || longitude === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    })
  }

  if (normalizedGooglePlaceId) {
    const existingLocation = await prisma.location.findUnique({
      where: { googlePlaceId: normalizedGooglePlaceId },
      include: locationInclude,
    })

    if (existingLocation) {
      return existingLocation
    }
  }

  // Create location
  const location = await prisma.location.create({
    data: {
      googlePlaceId: normalizedGooglePlaceId,
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
    include: locationInclude,
  })

  return location
})
