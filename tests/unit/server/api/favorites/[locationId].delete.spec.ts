import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/favorites/[locationId].delete')).default

describe('DELETE /api/favorites/:locationId', () => {
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
    expect(mocks.prisma.favorite.deleteMany).not.toHaveBeenCalled()
  })

  it('returns 400 without a location id', async () => {
    mocks.getRouterParam.mockReturnValue(undefined)

    await expect(handler(createMockEvent())).rejects.toThrow('Location ID is required')
    expect(mocks.prisma.favorite.deleteMany).not.toHaveBeenCalled()
  })

  it("deletes only the current user's favorite and auto-creates the user", async () => {
    mocks.getRouterParam.mockReturnValue('l1')
    mocks.prisma.favorite.deleteMany.mockResolvedValue({ count: 1 })

    expect(await handler(createMockEvent())).toEqual({ success: true })
    expect(mocks.prisma.user.upsert).toHaveBeenCalled()
    expect(mocks.prisma.favorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_1', locationId: 'l1' },
    })
  })

  it('succeeds when nothing was favorited', async () => {
    mocks.getRouterParam.mockReturnValue('l9')
    mocks.prisma.favorite.deleteMany.mockResolvedValue({ count: 0 })

    expect(await handler(createMockEvent())).toEqual({ success: true })
  })
})
