import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent, makeError } from '../../../../helpers/server'
import { roundToApprox } from '#shared/utils/people'

const mocks = setupServerMocks()

const handler = (await import('#server/api/users/people-settings.patch')).default

const stored = {
  id: 'me',
  clerkUserId: 'clerk_123',
  discoverable: true,
  approxLatitude: null,
  approxLongitude: null,
  approxLocationUpdatedAt: null,
  approxJitterLat: null,
  approxJitterLng: null,
}
const HOUR = 60 * 60 * 1000

describe('PATCH /api/users/people-settings', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation(makeError)
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue(stored)
    mocks.prisma.user.update.mockImplementation(async ({ data }) => ({ ...stored, ...data }))
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 1 })
  })

  it('rejects unauthenticated requests', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))
    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled()
  })

  it.each([
    [null],
    [[1]],
    [{ discoverable: 'yes' }],
    [{ latitude: 52 }],
    [{ latitude: 'a', longitude: 1 }],
    [{ latitude: 91, longitude: 0 }],
    [{ latitude: 0, longitude: -181 }],
    [{ latitude: Infinity, longitude: 0 }],
    [{ latitude: NaN, longitude: 0 }],
  ])('returns 400 for %j', async (body) => {
    mocks.readBody.mockResolvedValue(body)
    await expect(handler(createMockEvent())).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled()
  })

  it('returns 400 when turning discoverable on without any location', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...stored, discoverable: false })
    mocks.readBody.mockResolvedValue({ discoverable: true })
    await expect(handler(createMockEvent())).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('location'),
    })
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('returns 400 and stores nothing when a location is set while not discoverable', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...stored, discoverable: false })
    mocks.readBody.mockResolvedValue({ latitude: 52.5, longitude: 13.4 })
    await expect(handler(createMockEvent())).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Turn on Meet people'),
    })

    mocks.readBody.mockResolvedValue({ discoverable: false, latitude: 52.5, longitude: 13.4 })
    await expect(handler(createMockEvent())).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled()
  })

  it('stores a jittered cell-rounded location when opting in with coordinates', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...stored, discoverable: false })
    mocks.readBody.mockResolvedValue({
      discoverable: true,
      latitude: 52.520008,
      longitude: 13.404954,
    })

    const result = await handler(createMockEvent())

    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    const { data, where } = mocks.prisma.user.updateMany.mock.calls[0]![0]
    expect(where.id).toBe('me')
    expect(data.discoverable).toBe(true)
    expect(data.approxLocationUpdatedAt).toBeInstanceOf(Date)
    expect(Math.abs(data.approxJitterLat)).toBeLessThanOrEqual(0.005)
    // The longitude offset scales with the cell width (1 / cos(lat))
    const lngLimit = 0.005 / Math.cos((52.52 * Math.PI) / 180)
    expect(Math.abs(data.approxJitterLng)).toBeLessThanOrEqual(lngLimit)
    const cell = roundToApprox(52.520008, 13.404954)
    expect(data.approxLatitude).toBe(Math.round((cell.latitude + data.approxJitterLat) * 1e4) / 1e4)
    expect(data.approxLongitude).toBe(
      Math.round((cell.longitude + data.approxJitterLng) * 1e4) / 1e4
    )
    expect(result).toEqual({
      discoverable: true,
      hasApproxLocation: true,
      approxLocationUpdatedAt: expect.any(Date),
    })
    expect(JSON.stringify(result)).not.toMatch(/itter|approxLatitude|approxLongitude/)
  })

  it('reuses the stored jitter on later location changes', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...stored,
      approxLatitude: 1,
      approxLongitude: 2,
      approxLocationUpdatedAt: new Date(Date.now() - 7 * HOUR),
      approxJitterLat: 0.003,
      approxJitterLng: -0.002,
    })
    mocks.readBody.mockResolvedValue({ latitude: 10, longitude: 20 })

    await handler(createMockEvent())

    expect(mocks.prisma.user.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'me' }),
      data: {
        approxLatitude: 10.003,
        approxLongitude: 20.0019,
        approxLocationUpdatedAt: expect.any(Date),
        approxJitterLat: 0.003,
        approxJitterLng: -0.002,
      },
    })
  })

  it('generates different jitter for different users within bounds', async () => {
    mocks.readBody.mockResolvedValue({ latitude: 0, longitude: 0 })
    const seen = new Set<number>()
    for (let i = 0; i < 20; i++) {
      await handler(createMockEvent())
      const { data } = mocks.prisma.user.updateMany.mock.calls[i]![0]
      expect(Math.abs(data.approxJitterLat)).toBeLessThanOrEqual(0.005)
      expect(Math.abs(data.approxJitterLng)).toBeLessThanOrEqual(0.005)
      seen.add(data.approxJitterLat)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  describe('location cooldown', () => {
    it('applies the cooldown inside the write condition', async () => {
      mocks.readBody.mockResolvedValue({ latitude: 5, longitude: 5 })
      const before = Date.now()

      await handler(createMockEvent())

      const { where } = mocks.prisma.user.updateMany.mock.calls[0]![0]
      expect(where.id).toBe('me')
      expect(where.OR).toHaveLength(2)
      expect(where.OR[0]).toEqual({ approxLocationUpdatedAt: null })
      const lte: Date = where.OR[1].approxLocationUpdatedAt.lte
      expect(lte).toBeInstanceOf(Date)
      expect(lte.getTime()).toBeGreaterThanOrEqual(before - 6 * HOUR)
      expect(lte.getTime()).toBeLessThanOrEqual(Date.now() - 6 * HOUR)
      expect(mocks.prisma.user.findUnique).toHaveBeenCalledTimes(1) // only requireDbUser
    })

    it('answers 429 with Retry-After and retryAt when no row was updated, without update', async () => {
      const updatedAt = new Date(Date.now() - 2 * HOUR)
      mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 })
      mocks.prisma.user.findUnique
        .mockResolvedValueOnce({ ...stored, approxLatitude: 1, approxLongitude: 2 })
        .mockResolvedValueOnce({ approxLocationUpdatedAt: updatedAt })
      mocks.readBody.mockResolvedValue({ latitude: 1, longitude: 2 })

      const retryAt = new Date(updatedAt.getTime() + 6 * HOUR).toISOString()
      await expect(handler(createMockEvent())).rejects.toMatchObject({
        statusCode: 429,
        message: `You can change your location again after ${retryAt}`,
        data: { retryAt },
      })
      expect(mocks.prisma.user.findUnique).toHaveBeenLastCalledWith({
        where: { id: 'me' },
        select: { approxLocationUpdatedAt: true },
      })
      expect(mocks.setResponseHeader).toHaveBeenCalledWith(
        expect.anything(),
        'Retry-After',
        expect.any(Number)
      )
      const seconds = mocks.setResponseHeader.mock.calls[0]![2]
      expect(seconds).toBeGreaterThan(3.9 * 3600)
      expect(seconds).toBeLessThanOrEqual(4 * 3600)
      expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    })

    it('falls back to a full cooldown when the stored timestamp cannot be read', async () => {
      mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 })
      mocks.prisma.user.findUnique.mockResolvedValueOnce(stored).mockResolvedValueOnce(null)
      mocks.readBody.mockResolvedValue({ latitude: 1, longitude: 2 })

      await expect(handler(createMockEvent())).rejects.toMatchObject({ statusCode: 429 })
      const seconds = mocks.setResponseHeader.mock.calls[0]![2]
      expect(seconds).toBeGreaterThan(5.9 * 3600)
    })

    it('lets exactly one of two concurrent requests through', async () => {
      const updatedAt = new Date(Date.now() - 1000)
      mocks.prisma.user.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 })
      mocks.prisma.user.findUnique
        .mockResolvedValueOnce(stored)
        .mockResolvedValueOnce(stored)
        .mockResolvedValue({ approxLocationUpdatedAt: updatedAt })
      mocks.readBody.mockResolvedValue({ latitude: 5, longitude: 5 })

      const results = await Promise.allSettled([
        handler(createMockEvent()),
        handler(createMockEvent()),
      ])

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
      expect(rejected).toHaveLength(1)
      expect(rejected[0]!.reason).toMatchObject({
        statusCode: 429,
        data: { retryAt: new Date(updatedAt.getTime() + 6 * HOUR).toISOString() },
      })
      expect(mocks.prisma.user.updateMany).toHaveBeenCalledTimes(2)
      expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    })

    it('allows a change after 6 hours', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({
        ...stored,
        approxLocationUpdatedAt: new Date(Date.now() - 6 * HOUR - 1000),
        approxJitterLat: 0,
        approxJitterLng: 0,
      })
      mocks.readBody.mockResolvedValue({ latitude: 5, longitude: 5 })

      const result = await handler(createMockEvent())

      expect(mocks.prisma.user.updateMany).toHaveBeenCalledTimes(1)
      expect(result.hasApproxLocation).toBe(true)
    })

    it('allows the first location (no timestamp)', async () => {
      mocks.readBody.mockResolvedValue({ latitude: 5, longitude: 5 })
      await handler(createMockEvent())
      expect(mocks.prisma.user.updateMany).toHaveBeenCalledTimes(1)
      expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    })

    it('does not let opt-out followed by opt-in reset the cooldown', async () => {
      const updatedAt = new Date(Date.now() - HOUR)
      const row = {
        ...stored,
        approxLatitude: 1,
        approxLongitude: 2,
        approxLocationUpdatedAt: updatedAt,
        approxJitterLat: 0.001,
        approxJitterLng: 0.001,
      }
      mocks.prisma.user.findUnique.mockResolvedValue(row)
      mocks.readBody.mockResolvedValue({ discoverable: false })

      await handler(createMockEvent())

      // Coordinates cleared; timestamp and jitter are left untouched
      expect(mocks.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'me' },
        data: { discoverable: false, approxLatitude: null, approxLongitude: null },
      })
      expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled()

      mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 })
      mocks.prisma.user.findUnique
        .mockResolvedValueOnce({
          ...row,
          discoverable: false,
          approxLatitude: null,
          approxLongitude: null,
        })
        .mockResolvedValueOnce({ approxLocationUpdatedAt: updatedAt })
      mocks.readBody.mockResolvedValue({ discoverable: true, latitude: 3, longitude: 3 })
      await expect(handler(createMockEvent())).rejects.toMatchObject({ statusCode: 429 })
      expect(mocks.prisma.user.update).toHaveBeenCalledTimes(1)
    })
  })

  it('allows becoming discoverable with a previously stored location', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...stored,
      discoverable: false,
      approxLatitude: 1,
      approxLongitude: 2,
    })
    mocks.readBody.mockResolvedValue({ discoverable: true })

    await handler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'me' },
      data: { discoverable: true },
    })
  })

  it('opting out reports no location but still returns the kept timestamp', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...stored,
      approxLatitude: 1,
      approxLongitude: 2,
      approxLocationUpdatedAt: new Date(0),
    })
    mocks.readBody.mockResolvedValue({ discoverable: false })
    mocks.prisma.user.update.mockResolvedValue({
      ...stored,
      discoverable: false,
      approxLocationUpdatedAt: new Date(0),
    })

    const result = await handler(createMockEvent())

    expect(result).toEqual({
      discoverable: false,
      hasApproxLocation: false,
      approxLocationUpdatedAt: new Date(0),
    })
  })

  it('does not write when the body changes nothing', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...stored,
      approxLatitude: 1,
      approxLongitude: 2,
    })
    mocks.readBody.mockResolvedValue({})

    const result = await handler(createMockEvent())

    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    expect(result).toMatchObject({ discoverable: true, hasApproxLocation: true })
  })
})
