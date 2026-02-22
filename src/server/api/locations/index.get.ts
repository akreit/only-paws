import type { Prisma, LocationType } from '@prisma/client'

type LocationWithRelations = Prisma.LocationGetPayload<{
  include: {
    photos: true
    reviews: true
    _count: {
      select: {
        reviews: true
        photos: true
        favorites: true
      }
    }
  }
}>

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const filters: Prisma.LocationFindManyArgs = {
    include: {
      photos: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      reviews: true,
      _count: {
        select: {
          reviews: true,
          photos: true,
          favorites: true,
        },
      },
    },
    where: {},
  }

  // Apply type filter
  if (query.type && typeof query.type === 'string') {
    filters.where = {
      ...filters.where,
      type: query.type as LocationType,
    }
  }

  // Apply search filter
  if (query.search && typeof query.search === 'string') {
    filters.where = {
      ...filters.where,
      OR: [
        { name: { contains: query.search as string, mode: 'insensitive' } },
        { description: { contains: query.search as string, mode: 'insensitive' } },
        { address: { contains: query.search as string, mode: 'insensitive' } },
      ],
    }
  }

  // Apply radius filter (if coordinates provided)
  if (query.latitude && query.longitude && query.radiusKm) {
    const lat = parseFloat(query.latitude as string)
    const lng = parseFloat(query.longitude as string)
    const radiusKm = parseFloat(query.radiusKm as string)

    // Use PostGIS for radius search
    const radiusMeters = radiusKm * 1000

    // Raw query for geospatial search

    return await prisma.$queryRaw<
      Array<{
        id: string
        name: string
        type: LocationType
        description: string | null
        address: string
        latitude: number
        longitude: number
      }>
    >`
      SELECT l.*
      FROM "Location" l
      WHERE ST_DWithin(
        l.coordinates,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
    `
  }

  const locations = (await prisma.location.findMany(filters)) as LocationWithRelations[]

  // Calculate average rating for each location
  return locations.map((location) => {
    const reviews = location.reviews ?? []
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0

    return {
      ...location,
      averageRating,
    }
  })
})
