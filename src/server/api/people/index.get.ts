import type { Prisma } from '@prisma/client'

/**
 * Upper bound on rows fetched from the database. The bounding box already narrows the
 * candidates; distance filtering, ranking and pagination then happen in memory.
 * With more discoverable people than this inside the box, the rest are not reachable
 * (acceptable for v1; switch to PostGIS or keyset pagination if it gets there).
 */
const MAX_CANDIDATES = 500

export default defineEventHandler(async (event) => {
  const me = await requireDbUser(event)

  const parsed = parsePeopleQuery(getQuery(event))
  if (!parsed.ok) throw createError({ statusCode: 400, message: parsed.error })
  const { radius, page, pageSize, breed, lookingFor, hasDog } = parsed.value

  // Reciprocity: only people who can be found may browse
  if (!me.discoverable) {
    throw createError({
      statusCode: 403,
      message: 'Turn on Meet people in your profile to browse people',
    })
  }

  const { approxLatitude, approxLongitude } = me
  if (approxLatitude == null || approxLongitude == null) {
    throw createError({
      statusCode: 400,
      message: 'Set your approximate location in your profile to find people nearby',
    })
  }

  await enforcePeopleSearchLimit(event, me.id)

  const box = boundingBox(approxLatitude, approxLongitude, radius)
  const where: Prisma.UserWhereInput = {
    discoverable: true,
    id: { not: me.id },
    approxLatitude: { gte: box.minLat, lte: box.maxLat },
    approxLongitude: { gte: box.minLng, lte: box.maxLng },
  }
  if (breed) where.dogBreed = { contains: breed, mode: 'insensitive' }
  if (lookingFor.length > 0) where.lookingFor = { hasSome: lookingFor }
  if (hasDog) where.hasDog = true

  const candidates = await withDatabaseErrorHandling(() =>
    prisma.user.findMany({
      where,
      select: { ...PEOPLE_CARD_SELECT, approxLatitude: true, approxLongitude: true },
      take: MAX_CANDIDATES,
    })
  )

  const ranked = candidates
    .map(({ approxLatitude: lat, approxLongitude: lng, ...person }) => {
      const km = haversineKm(approxLatitude, approxLongitude, lat as number, lng as number)
      return {
        person,
        km,
        // Rank by bucket, not exact distance, so the order does not reveal finer detail
        bucket: distanceBucketKm(km),
        shared: person.lookingFor.filter((tag) => me.lookingFor.includes(tag)).length,
      }
    })
    .filter((entry) => entry.km <= radius)
    .sort(
      (a, b) => a.bucket - b.bucket || b.shared - a.shared || a.person.id.localeCompare(b.person.id)
    )

  const start = (page - 1) * pageSize
  return {
    people: ranked.slice(start, start + pageSize).map(({ person, km }) => ({
      ...person,
      distanceLabel: bucketDistance(km),
    })),
    page,
    pageSize,
    total: ranked.length,
    hasMore: start + pageSize < ranked.length,
  }
})
