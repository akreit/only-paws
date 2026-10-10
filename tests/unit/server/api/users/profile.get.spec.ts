import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'
import { createMockUser } from '../../../../fixtures/factories'

const mocks = setupServerMocks()

const handler = (await import('#server/api/users/profile.get')).default

describe('GET /api/users/profile', () => {
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
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))
    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('creates the database user on first request instead of returning 404', async () => {
    // First lookup (requireDbUser) misses, second (profile load) finds the created row
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...createMockUser(),
      locations: [],
      reviews: [],
    })

    await handler(createMockEvent())

    expect(mocks.prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
      update: {},
      create: { clerkUserId: 'clerk_123' },
    })
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user_1' } })
    )
  })

  it('returns 404 if the user disappears between upsert and load', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null)
    await expect(handler(createMockEvent())).rejects.toThrow('User not found')
  })

  it('returns the user including profile fields', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...createMockUser(),
      homeCity: 'Berlin',
      hasDog: true,
      dogName: 'Rex',
      dogBreed: 'Beagle',
      lookingFor: ['FRIENDS'],
      locations: [
        { id: 'l1', reviews: [{ rating: 4 }, { rating: 2 }] },
        { id: 'l2', reviews: [] },
      ],
      reviews: [],
    })

    const result = (await handler(createMockEvent())) as {
      user: Record<string, unknown>
      locations: { id: string; averageRating: number }[]
    }

    expect(result.user).toMatchObject({
      homeCity: 'Berlin',
      hasDog: true,
      dogName: 'Rex',
      dogBreed: 'Beagle',
      lookingFor: ['FRIENDS'],
    })
    expect(result.locations.map((l) => l.averageRating)).toEqual([3, 0])
  })
})
