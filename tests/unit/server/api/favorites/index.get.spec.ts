import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/favorites/index.get')).default

describe('GET /api/favorites', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.upsert.mockResolvedValue({ id: 'user_1', clerkUserId: 'clerk_123' })
  })

  it('requires authentication', async () => {
    mocks.requireAuth.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    )
    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.favorite.findMany).not.toHaveBeenCalled()
  })

  it('auto-creates the database user', async () => {
    mocks.prisma.favorite.findMany.mockResolvedValue([])

    expect(await handler(createMockEvent())).toEqual([])
    expect(mocks.prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
      update: {},
      create: { clerkUserId: 'clerk_123' },
    })
  })

  it('returns locationId and location with averageRating, newest first, for the current user only', async () => {
    mocks.prisma.favorite.findMany.mockResolvedValue([
      { locationId: 'l2', location: { id: 'l2', reviews: [{ rating: 4 }, { rating: 2 }] } },
      { locationId: 'l1', location: { id: 'l1', reviews: [] } },
    ])

    const result = (await handler(createMockEvent())) as {
      locationId: string
      location: { id: string; averageRating: number }
    }[]

    expect(result.map((f) => f.locationId)).toEqual(['l2', 'l1'])
    expect(result.map((f) => f.location.averageRating)).toEqual([3, 0])

    const args = mocks.prisma.favorite.findMany.mock.calls[0][0]
    expect(args.where).toEqual({ userId: 'user_1' })
    expect(args.orderBy).toEqual({ createdAt: 'desc' })
    expect(args.include.location.include.photos.take).toBe(1)
    expect(args.include.location.include.reviews).toBe(true)
    expect(args.include.location.include._count).toBeDefined()
  })
})
