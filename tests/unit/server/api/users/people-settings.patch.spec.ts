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
  })

  it('rejects unauthenticated requests', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))
    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
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
  })

  it('stores a jittered cell-rounded location when opting in with coordinates', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...stored, discoverable: false })
    mocks.readBody.mockResolvedValue({
      discoverable: true,
      latitude: 52.520008,
      longitude: 13.404954,
    })

    const result = await handler(createMockEvent())

    const { data, where } = mocks.prisma.user.update.mock.calls[0]![0]
    expect(where).toEqual({ id: 'me' })
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

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'me' },
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
      const { data } = mocks.prisma.user.update.mock.calls[i]![0]
      expect(Math.abs(data.approxJitterLat)).toBeLessThanOrEqual(0.005)
      expect(Math.abs(data.approxJitterLng)).toBeLessThanOrEqual(0.005)
      seen.add(data.approxJitterLat)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  describe('location cooldown', () => {
    it('answers 429 with Retry-After and retryAt within 6 hours and does not update', async () => {
      const updatedAt = new Date(Date.now() - 2 * HOUR)
      mocks.prisma.user.findUnique.mockResolvedValue({
        ...stored,
        approxLatitude: 1,
        approxLongitude: 2,
        approxLocationUpdatedAt: updatedAt,
      })
      mocks.readBody.mockResolvedValue({ latitude: 1, longitude: 2 })

      const retryAt = new Date(updatedAt.getTime() + 6 * HOUR).toISOString()
      await expect(handler(createMockEvent())).rejects.toMatchObject({
        statusCode: 429,
        message: `You can change your location again after ${retryAt}`,
        data: { retryAt },
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

    it('allows a change after 6 hours', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({
        ...stored,
        approxLocationUpdatedAt: new Date(Date.now() - 6 * HOUR - 1000),
        approxJitterLat: 0,
        approxJitterLng: 0,
      })
      mocks.readBody.mockResolvedValue({ latitude: 5, longitude: 5 })

      await handler(createMockEvent())

      expect(mocks.prisma.user.update).toHaveBeenCalledTimes(1)
    })

    it('allows the first location (no timestamp)', async () => {
      mocks.readBody.mockResolvedValue({ latitude: 5, longitude: 5 })
      await handler(createMockEvent())
      expect(mocks.prisma.user.update).toHaveBeenCalledTimes(1)
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

      mocks.prisma.user.findUnique.mockResolvedValue({
        ...row,
        discoverable: false,
        approxLatitude: null,
        approxLongitude: null,
      })
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
