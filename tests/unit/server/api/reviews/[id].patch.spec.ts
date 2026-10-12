import { describe, it, expect, beforeEach } from 'vitest'
import { PUBLIC_USER_SELECT } from '#server/utils/public-user'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/reviews/[id].patch')).default

describe('PATCH /api/reviews/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.getRouterParam.mockReturnValue('rev-1')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', authorId: 'user-1' })
  })

  async function expectStatus(statusCode: number, message: string) {
    await expect(handler(createMockEvent())).rejects.toThrow(message)
    expect(mocks.createError).toHaveBeenCalledWith(expect.objectContaining({ statusCode, message }))
    expect(mocks.prisma.review.update).not.toHaveBeenCalled()
  }

  it('rejects signed-out users', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))

    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
  })

  it('returns 400 when the id is missing', async () => {
    mocks.getRouterParam.mockReturnValue(undefined)

    await expectStatus(400, 'Review ID is required')
  })

  it('returns 404 when the review does not exist', async () => {
    mocks.prisma.review.findUnique.mockResolvedValue(null)
    mocks.readBody.mockResolvedValue({ rating: 4 })

    await expectStatus(404, 'Review not found')
  })

  it('returns 403 for anyone but the author', async () => {
    mocks.prisma.review.findUnique.mockResolvedValue({ id: 'rev-1', authorId: 'someone-else' })
    mocks.readBody.mockResolvedValue({ rating: 4 })

    await expectStatus(403, 'Forbidden')
  })

  it.each([0, 6, 3.5, '4'])('returns 400 for the rating %j', async (rating) => {
    mocks.readBody.mockResolvedValue({ rating })

    await expectStatus(400, 'Rating must be an integer between 1 and 5')
  })

  it('returns 400 for an invalid comment', async () => {
    mocks.readBody.mockResolvedValue({ comment: 'a'.repeat(2001) })

    await expectStatus(400, 'Comment must be at most 2000 characters')
  })

  it('returns 400 when nothing is provided', async () => {
    mocks.readBody.mockResolvedValue({})

    await expectStatus(400, 'At least one field to update is required')
  })

  it('updates the review and returns it with its author', async () => {
    mocks.readBody.mockResolvedValue({ rating: 2, comment: '  Meh  ' })
    mocks.prisma.review.update.mockResolvedValue({
      id: 'rev-1',
      rating: 2,
      comment: 'Meh',
      author: { id: 'user-1' },
    })

    const result = await handler(createMockEvent())

    expect(mocks.prisma.review.update).toHaveBeenCalledWith({
      where: { id: 'rev-1' },
      data: { rating: 2, comment: 'Meh' },
      include: { author: { select: PUBLIC_USER_SELECT } },
    })
    expect(result).toMatchObject({ id: 'rev-1', rating: 2, author: { id: 'user-1' } })
  })

  it('clears the comment when it is empty', async () => {
    mocks.readBody.mockResolvedValue({ comment: '' })
    mocks.prisma.review.update.mockResolvedValue({ id: 'rev-1', comment: null })

    await handler(createMockEvent())

    expect(mocks.prisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { comment: null } })
    )
  })
})
