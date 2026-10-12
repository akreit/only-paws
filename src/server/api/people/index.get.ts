import type { LookingFor, Prisma } from '@prisma/client'
import { LOOKING_FOR_VALUES } from '../../../app/types/user'

/**
 * Upper bound on rows fetched from the database. The bounding box already narrows the
 * candidates; distance filtering, ranking and pagination then happen in memory.
 * With more discoverable people than this inside the box, the rest are not reachable
 * (acceptable for v1; switch to PostGIS or keyset pagination if it gets there).
 */
const MAX_CANDIDATES = 500
const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 20
const MAX_BREED_LENGTH = 50

function single(value: unknown): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first : undefined
}

function parsePositiveInt(value: string | undefined, fallback: number, name: string, max?: number) {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) {
    throw createError({ statusCode: 400, message: `Invalid ${name}` })
  }
  return parsed
}

export default defineEventHandler(async (event) => {
  const me = await requireDbUser(event)
  const query = getQuery(event)

  const radius = parsePositiveInt(single(query.radius), DEFAULT_PEOPLE_RADIUS_KM, 'radius')
  if (!(PEOPLE_RADII_KM as readonly number[]).includes(radius)) {
    throw createError({
      statusCode: 400,
      message: `Invalid radius; use one of ${PEOPLE_RADII_KM.join(', ')} km`,
    })
  }
  const page = parsePositiveInt(single(query.page), 1, 'page')
  const pageSize = parsePositiveInt(
    single(query.pageSize),
    DEFAULT_PAGE_SIZE,
    'pageSize',
    MAX_PAGE_SIZE
  )

  const breed = single(query.breed)?.trim() ?? ''
  if (breed.length > MAX_BREED_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Breed must be at most ${MAX_BREED_LENGTH} characters`,
    })
  }

  const lookingForRaw = single(query.lookingFor)
  const lookingFor = lookingForRaw
    ? lookingForRaw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  if (!lookingFor.every((value) => (LOOKING_FOR_VALUES as readonly string[]).includes(value))) {
    throw createError({ statusCode: 400, message: 'Invalid lookingFor value' })
  }
  const wanted = lookingFor as LookingFor[]

  const { approxLatitude, approxLongitude } = me
  if (approxLatitude == null || approxLongitude == null) {
    throw createError({
      statusCode: 400,
      message: 'Set your approximate location in your profile to find people nearby',
    })
  }

  const box = boundingBox(approxLatitude, approxLongitude, radius)
  const where: Prisma.UserWhereInput = {
    discoverable: true,
    id: { not: me.id },
    approxLatitude: { gte: box.minLat, lte: box.maxLat },
    approxLongitude: { gte: box.minLng, lte: box.maxLng },
  }
  if (breed) where.dogBreed = { contains: breed, mode: 'insensitive' }
  if (wanted.length > 0) where.lookingFor = { hasSome: wanted }
  if (query.hasDog === 'true') where.hasDog = true

  const candidates = await withDatabaseErrorHandling(() =>
    prisma.user.findMany({
      where,
      select: { ...PUBLIC_USER_SELECT, approxLatitude: true, approxLongitude: true },
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
