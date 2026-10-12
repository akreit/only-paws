import { randomInt } from 'node:crypto'

/** A location can be changed once per this period (blocks trilateration by moving the origin). */
const LOCATION_COOLDOWN_MS = 6 * 60 * 60 * 1000

/** Uniform in [0, 1) from a cryptographic source. */
function secureRandom(): number {
  return randomInt(0, 2 ** 32) / 2 ** 32
}

export default defineEventHandler(async (event) => {
  const me = await requireDbUser(event)
  const body = await readBody(event)

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw createError({ statusCode: 400, message: 'Body must be an object' })
  }
  const { discoverable, latitude, longitude } = body as Record<string, unknown>

  if (discoverable !== undefined && typeof discoverable !== 'boolean') {
    throw createError({ statusCode: 400, message: 'discoverable must be a boolean' })
  }

  const hasCoordinates = latitude !== undefined || longitude !== undefined
  if (hasCoordinates) {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw createError({
        statusCode: 400,
        message: 'latitude and longitude must be valid coordinates',
      })
    }
  }

  const data: {
    discoverable?: boolean
    approxLatitude?: number | null
    approxLongitude?: number | null
    approxLocationUpdatedAt?: Date
    approxJitterLat?: number
    approxJitterLng?: number
  } = {}

  if (hasCoordinates) {
    // A location is only kept for people who opted in
    if (!(discoverable ?? me.discoverable)) {
      throw createError({
        statusCode: 400,
        message: 'Turn on Meet people before setting your location',
      })
    }

    // The jitter is created once and then reused forever, so repeated sets cannot be averaged
    const jitter =
      me.approxJitterLat != null && me.approxJitterLng != null
        ? { lat: me.approxJitterLat, lng: me.approxJitterLng }
        : randomJitter(
            roundToApprox(latitude as number, longitude as number).latitude,
            secureRandom
          )
    // Round before storing: exact coordinates never reach the database
    const approx = approximateLocation(latitude as number, longitude as number, jitter)
    data.approxLatitude = approx.latitude
    data.approxLongitude = approx.longitude
    data.approxLocationUpdatedAt = new Date()
    data.approxJitterLat = jitter.lat
    data.approxJitterLng = jitter.lng
  }

  if (discoverable === false) {
    // Opting out removes the stored coordinates; timestamp and jitter stay
    data.discoverable = false
    data.approxLatitude = null
    data.approxLongitude = null
  } else if (discoverable === true) {
    if (!hasCoordinates && me.approxLatitude == null) {
      throw createError({
        statusCode: 400,
        message: 'Set your approximate location before becoming discoverable',
      })
    }
    data.discoverable = true
  }

  let updated = me
  if (hasCoordinates) {
    // Cooldown, checked and applied in one statement so concurrent requests can't both pass.
    // The timestamp survives opting out, so opting out and back in can't reset it.
    const now = data.approxLocationUpdatedAt as Date
    const result = await withDatabaseErrorHandling(() =>
      prisma.user.updateMany({
        where: {
          id: me.id,
          OR: [
            { approxLocationUpdatedAt: null },
            { approxLocationUpdatedAt: { lte: new Date(now.getTime() - LOCATION_COOLDOWN_MS) } },
          ],
        },
        data,
      })
    )
    if (result.count === 0) {
      const current = await withDatabaseErrorHandling(() =>
        prisma.user.findUnique({
          where: { id: me.id },
          select: { approxLocationUpdatedAt: true },
        })
      )
      const changedAt = current?.approxLocationUpdatedAt ?? now
      const retryAt = new Date(changedAt.getTime() + LOCATION_COOLDOWN_MS)
      throwRateLimited(
        event,
        `You can change your location again after ${retryAt.toISOString()}`,
        retryAt
      )
    }
    updated = { ...me, ...data } as typeof me
  } else if (Object.keys(data).length) {
    updated = await withDatabaseErrorHandling(() =>
      prisma.user.update({ where: { id: me.id }, data })
    )
  }

  return {
    discoverable: updated.discoverable,
    hasApproxLocation: updated.approxLatitude != null && updated.approxLongitude != null,
    approxLocationUpdatedAt: updated.approxLocationUpdatedAt,
  }
})
