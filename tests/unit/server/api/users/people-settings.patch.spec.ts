import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/users/people-settings.patch')).default

const stored = { id: 'me', clerkUserId: 'clerk_123', approxLatitude: null, approxLongitude: null }

describe('PATCH /api/users/people-settings', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
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
    mocks.readBody.mockResolvedValue({ discoverable: true })
    await expect(handler(createMockEvent())).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('location'),
    })
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('rounds supplied coordinates before storing and returns no coordinates', async () => {
    mocks.readBody.mockResolvedValue({
      discoverable: true,
      latitude: 52.520008,
      longitude: 13.404954,
    })

    const result = await handler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'me' },
      data: {
        approxLatitude: 52.52,
        approxLongitude: 13.4,
        approxLocationUpdatedAt: expect.any(Date),
        discoverable: true,
      },
    })
    expect(result).toEqual({
      discoverable: true,
      hasApproxLocation: true,
      approxLocationUpdatedAt: expect.any(Date),
    })
  })

  it('allows becoming discoverable with a previously stored location', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...stored,
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

  it('stores only a location when discoverable is not given', async () => {
    mocks.readBody.mockResolvedValue({ latitude: 10.126, longitude: 20.994 })

    await handler(createMockEvent())

    const { data } = mocks.prisma.user.update.mock.calls[0]![0]
    expect(data).toMatchObject({ approxLatitude: 10.13, approxLongitude: 20.99 })
    expect(data).not.toHaveProperty('discoverable')
  })

  it('opting out clears the stored location', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...stored,
      approxLatitude: 1,
      approxLongitude: 2,
    })
    mocks.readBody.mockResolvedValue({ discoverable: false, latitude: 5, longitude: 5 })

    const result = await handler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'me' },
      data: {
        discoverable: false,
        approxLatitude: null,
        approxLongitude: null,
        approxLocationUpdatedAt: null,
      },
    })
    expect(result).toEqual({
      discoverable: false,
      hasApproxLocation: false,
      approxLocationUpdatedAt: null,
    })
  })

  it('does not write when the body changes nothing', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...stored,
      discoverable: true,
      approxLatitude: 1,
      approxLongitude: 2,
      approxLocationUpdatedAt: null,
    })
    mocks.readBody.mockResolvedValue({})

    const result = await handler(createMockEvent())

    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
    expect(result).toMatchObject({ discoverable: true, hasApproxLocation: true })
  })
})
