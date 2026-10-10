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

// Public, not user-specific: let the CDN serve it briefly
const LIST_CACHE_CONTROL = 'public, max-age=0, s-maxage=30, stale-while-revalidate=60'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const filters: Prisma.LocationFindManyArgs = {
    include: LOCATION_LIST_INCLUDE,
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

    const nearby = await withDatabaseErrorHandling(
      () => prisma.$queryRaw<
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
    )
    setResponseHeader(event, 'Cache-Control', LIST_CACHE_CONTROL)
    return nearby
  }

  const locations = (await withDatabaseErrorHandling(() =>
    prisma.location.findMany(filters)
  )) as LocationWithRelations[]

  setResponseHeader(event, 'Cache-Control', LIST_CACHE_CONTROL)
  return locations.map(withAverageRating)
})
