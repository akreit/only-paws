import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent, makeError } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/people/index.get')).default

const me = {
  id: 'me',
  clerkUserId: 'clerk_123',
  discoverable: true,
  approxLatitude: 52.52,
  approxLongitude: 13.4,
  lookingFor: ['FRIENDS', 'TIPS'],
}

function candidate(id: string, lat: number, lng: number, lookingFor: string[] = []) {
  return {
    id,
    username: id,
    avatarUrl: null,
    bio: null,
    homeCity: 'Berlin',
    hasDog: true,
    dogName: 'Rex',
    dogBreed: 'Beagle',
    lookingFor,
    approxLatitude: lat,
    approxLongitude: lng,
  }
}

async function call(query: Record<string, unknown> = {}) {
  mocks.getQuery.mockReturnValue(query)
  return (await handler(createMockEvent())) as {
    people: Record<string, unknown>[]
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

describe('GET /api/people', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation(makeError)
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue(me)
    mocks.prisma.user.findMany.mockResolvedValue([])
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 1 })
  })

  it('rejects unauthenticated requests', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))
    await expect(call()).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.findMany).not.toHaveBeenCalled()
  })

  it.each([
    [{ radius: '3' }, 'Invalid radius'],
    [{ radius: 'abc' }, 'Invalid radius'],
    [{ page: '0' }, 'Invalid page'],
    [{ page: '1.5' }, 'Invalid page'],
    [{ pageSize: '51' }, 'Invalid pageSize'],
    [{ pageSize: '0' }, 'Invalid pageSize'],
    [{ lookingFor: 'FRIENDS,CATS' }, 'Invalid lookingFor'],
    [{ breed: 'x'.repeat(51) }, 'at most 50'],
  ])('returns 400 for %j', async (query, message) => {
    await expect(call(query)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining(message),
    })
    expect(mocks.prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('returns 403 unless the searcher is discoverable, before any other work', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...me,
      discoverable: false,
      approxLatitude: null,
    })
    await expect(call()).rejects.toMatchObject({
      statusCode: 403,
      message: 'Turn on Meet people in your profile to browse people',
    })
    expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled()
    expect(mocks.prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('returns 429 with Retry-After and retryAt and skips the search when rate limited', async () => {
    const windowStart = new Date(Date.now() - 10 * 60 * 1000)
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 })
    mocks.prisma.user.findUnique.mockResolvedValue({ ...me, peopleSearchWindowStart: windowStart })

    await expect(call()).rejects.toMatchObject({
      statusCode: 429,
      data: { retryAt: new Date(windowStart.getTime() + 3600_000).toISOString() },
    })
    expect(mocks.setResponseHeader).toHaveBeenCalledWith(
      expect.anything(),
      'Retry-After',
      expect.any(Number)
    )
    expect(mocks.prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('returns 400 when the searcher has no stored location', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...me, approxLatitude: null })
    await expect(call()).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('approximate location'),
    })
    expect(mocks.prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('only queries other discoverable users inside the bounding box', async () => {
    await call({ radius: '5', breed: ' beagle ', lookingFor: 'FRIENDS,PLAYDATES', hasDog: 'true' })

    const args = mocks.prisma.user.findMany.mock.calls[0]![0]
    expect(args.where).toMatchObject({
      discoverable: true,
      id: { not: 'me' },
      dogBreed: { contains: 'beagle', mode: 'insensitive' },
      lookingFor: { hasSome: ['FRIENDS', 'PLAYDATES'] },
      hasDog: true,
    })
    expect(args.where.approxLatitude).toEqual({
      gte: expect.any(Number),
      lte: expect.any(Number),
    })
    expect(args.where.approxLongitude).toEqual({
      gte: expect.any(Number),
      lte: expect.any(Number),
    })
    expect(args.take).toBe(500)
    expect(args.select).toMatchObject({ id: true, approxLatitude: true })
    expect(args.select).not.toHaveProperty('email')
    expect(args.select).not.toHaveProperty('clerkUserId')
  })

  it('omits optional filters when not requested', async () => {
    await call()
    const { where } = mocks.prisma.user.findMany.mock.calls[0]![0]
    expect(where).not.toHaveProperty('dogBreed')
    expect(where).not.toHaveProperty('lookingFor')
    expect(where).not.toHaveProperty('hasDog')
  })

  it('never returns coordinates or exact distances', async () => {
    mocks.prisma.user.findMany.mockResolvedValue([candidate('a', 52.53, 13.4)])

    const result = await call()

    expect(Object.keys(result.people[0]!).sort()).toEqual(
      [
        'avatarUrl',
        'bio',
        'distanceLabel',
        'dogBreed',
        'dogName',
        'hasDog',
        'homeCity',
        'id',
        'lookingFor',
        'username',
      ].sort()
    )
    expect(result.people[0]!.distanceLabel).toBe('~2 km')
  })

  it('filters outside the radius, sorts by distance bucket then shared tags, and paginates', async () => {
    mocks.prisma.user.findMany.mockResolvedValue([
      candidate('far', 52.52, 13.7), // ~20 km, outside 10
      candidate('near-none', 52.525, 13.4, []), // ~0.5 km
      candidate('near-shared', 52.526, 13.4, ['FRIENDS', 'TIPS']), // ~0.7 km
      candidate('mid', 52.57, 13.4, ['FRIENDS']), // ~5.5 km
    ])

    const first = await call({ pageSize: '2' })
    expect(first.people.map((p) => p.id)).toEqual(['near-shared', 'near-none'])
    expect(first).toMatchObject({ page: 1, pageSize: 2, total: 3, hasMore: true })

    const second = await call({ pageSize: '2', page: '2' })
    expect(second.people.map((p) => p.id)).toEqual(['mid'])
    expect(second.hasMore).toBe(false)
  })

  it('defaults to radius 10, page 1, page size 20 and accepts array query values', async () => {
    const result = await call({ radius: ['10'] })
    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 0, hasMore: false })
  })
})
