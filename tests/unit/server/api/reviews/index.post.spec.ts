import { describe, it, expect, beforeEach } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/reviews/index.post')).default

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
  })

  it.each([0, 6, 3.5, '4', undefined])('returns 400 for the rating %j', async (rating) => {
    mocks.readBody.mockResolvedValue({ rating, locationId: 'loc-1' })

    await expect(handler(createMockEvent())).rejects.toThrow('Invalid input')
    expect(mocks.prisma.review.create).not.toHaveBeenCalled()
  })

  it('returns 400 without a location', async () => {
    mocks.readBody.mockResolvedValue({ rating: 4 })

    await expect(handler(createMockEvent())).rejects.toThrow('Invalid input')
    expect(mocks.prisma.review.create).not.toHaveBeenCalled()
  })

  it.each([
    [123, 'Comment must be a string or null'],
    [{ text: 'hi' }, 'Comment must be a string or null'],
    ['x'.repeat(2001), 'Comment must be at most 2000 characters'],
  ])('returns 400 for the comment %#', async (comment, message) => {
    mocks.readBody.mockResolvedValue({ rating: 4, comment, locationId: 'loc-1' })

    await expect(handler(createMockEvent())).rejects.toMatchObject({ statusCode: 400, message })
    expect(mocks.prisma.review.create).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-string location', async () => {
    mocks.readBody.mockResolvedValue({ rating: 4, locationId: 42 })

    await expect(handler(createMockEvent())).rejects.toThrow('Invalid input')
    expect(mocks.prisma.review.create).not.toHaveBeenCalled()
  })

  it.each([
    ['  Nice  ', 'Nice'],
    ['   ', null],
    [null, null],
    [undefined, undefined],
  ])('saves the comment %j as %j', async (comment, saved) => {
    mocks.readBody.mockResolvedValue({ rating: 5, comment, locationId: 'loc-1' })
    mocks.prisma.review.create.mockResolvedValue({ id: 'rev-1' })

    await handler(createMockEvent())

    expect(mocks.prisma.review.create).toHaveBeenCalledWith({
      data: { rating: 5, comment: saved, locationId: 'loc-1', authorId: 'user-1' },
      include: { author: true },
    })
  })

  it('creates the review for the signed-in user', async () => {
    mocks.readBody.mockResolvedValue({ rating: 4, comment: 'Nice', locationId: 'loc-1' })
    mocks.prisma.review.create.mockResolvedValue({ id: 'rev-1' })

    const result = await handler(createMockEvent())

    expect(mocks.prisma.review.create).toHaveBeenCalledWith({
      data: { rating: 4, comment: 'Nice', locationId: 'loc-1', authorId: 'user-1' },
      include: { author: true },
    })
    expect(result).toEqual({ id: 'rev-1' })
  })
})
