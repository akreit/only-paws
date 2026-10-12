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
  let approx: { latitude: number; longitude: number } | undefined
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
    // Round before storing: exact coordinates never reach the database
    approx = roundToApprox(latitude, longitude)
  }

  const data: {
    discoverable?: boolean
    approxLatitude?: number | null
    approxLongitude?: number | null
    approxLocationUpdatedAt?: Date | null
  } = {}

  if (discoverable === false) {
    // Opting out removes the stored location as well
    data.discoverable = false
    data.approxLatitude = null
    data.approxLongitude = null
    data.approxLocationUpdatedAt = null
  } else {
    if (approx) {
      data.approxLatitude = approx.latitude
      data.approxLongitude = approx.longitude
      data.approxLocationUpdatedAt = new Date()
    }
    if (discoverable === true) {
      const hasLocation = approx !== undefined || me.approxLatitude != null
      if (!hasLocation) {
        throw createError({
          statusCode: 400,
          message: 'Set your approximate location before becoming discoverable',
        })
      }
      data.discoverable = true
    }
  }

  const updated = Object.keys(data).length
    ? await withDatabaseErrorHandling(() => prisma.user.update({ where: { id: me.id }, data }))
    : me

  return {
    discoverable: updated.discoverable,
    hasApproxLocation: updated.approxLatitude != null && updated.approxLongitude != null,
    approxLocationUpdatedAt: updated.approxLocationUpdatedAt,
  }
})
