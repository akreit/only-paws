import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/favorites/index.post')).default

describe('POST /api/favorites', () => {
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
    expect(mocks.prisma.favorite.upsert).not.toHaveBeenCalled()
  })

  it.each([{}, { locationId: '' }, { locationId: '   ' }, { locationId: 42 }, null])(
    'returns 400 for invalid body %j',
    async (body) => {
      mocks.readBody.mockResolvedValue(body)

      await expect(handler(createMockEvent())).rejects.toThrow('Location ID is required')
      expect(mocks.createError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
      expect(mocks.prisma.favorite.upsert).not.toHaveBeenCalled()
    }
  )

  it('returns 404 for an unknown location', async () => {
    mocks.readBody.mockResolvedValue({ locationId: 'nope' })
    mocks.prisma.location.findUnique.mockResolvedValue(null)

    await expect(handler(createMockEvent())).rejects.toThrow('Location not found')
    expect(mocks.createError).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Location not found',
    })
    expect(mocks.prisma.favorite.upsert).not.toHaveBeenCalled()
  })

  it('auto-creates the user and upserts the favorite (idempotent)', async () => {
    mocks.readBody.mockResolvedValue({ locationId: 'l1' })
    mocks.prisma.location.findUnique.mockResolvedValue({ id: 'l1' })
    const favorite = { id: 'f1', userId: 'user_1', locationId: 'l1' }
    mocks.prisma.favorite.upsert.mockResolvedValue(favorite)

    expect(await handler(createMockEvent())).toEqual(favorite)
    expect(await handler(createMockEvent())).toEqual(favorite)

    expect(mocks.prisma.user.upsert).toHaveBeenCalledTimes(2)
    expect(mocks.prisma.favorite.upsert).toHaveBeenCalledWith({
      where: { userId_locationId: { userId: 'user_1', locationId: 'l1' } },
      create: { userId: 'user_1', locationId: 'l1' },
      update: {},
    })
  })
})
