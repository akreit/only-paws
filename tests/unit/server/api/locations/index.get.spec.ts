import { describe, it, expect, beforeEach } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()
const setResponseHeader = vi.fn()
vi.stubGlobal('setResponseHeader', setResponseHeader)

const handler = (await import('#server/api/locations/index.get')).default

describe('GET /api/locations', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getQuery.mockReturnValue({})
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
  })

  it('returns locations with computed averageRating', async () => {
    mocks.prisma.location.findMany.mockResolvedValue([
      {
        id: '1',
        name: 'Dog Park',
        reviews: [{ rating: 3 }, { rating: 4 }, { rating: 5 }],
      },
    ])

    const result = await handler(createMockEvent())

    expect(result).toHaveLength(1)
    expect(result[0].averageRating).toBe(4)
    expect(result[0].name).toBe('Dog Park')
  })

  it('sets a short public CDN cache header on success', async () => {
    mocks.prisma.location.findMany.mockResolvedValue([])
    const event = createMockEvent()

    await handler(event)

    expect(setResponseHeader).toHaveBeenCalledWith(
      event,
      'Cache-Control',
      'public, max-age=0, s-maxage=30, stale-while-revalidate=60'
    )
  })

  it('sets the cache header on radius search too', async () => {
    mocks.getQuery.mockReturnValue({ latitude: '1', longitude: '2', radiusKm: '3' })
    mocks.prisma.$queryRaw.mockResolvedValue([])

    await handler(createMockEvent())

    expect(setResponseHeader).toHaveBeenCalledWith(
      expect.anything(),
      'Cache-Control',
      expect.stringContaining('s-maxage=30')
    )
  })

  it('does not set the cache header on errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.prisma.location.findMany.mockRejectedValue(
      Object.assign(new Error('boom'), { code: 'ECONNREFUSED' })
    )

    await expect(handler(createMockEvent())).rejects.toBeDefined()

    expect(setResponseHeader).not.toHaveBeenCalled()
  })

  it('returns empty array when no locations', async () => {
    mocks.prisma.location.findMany.mockResolvedValue([])

    const result = await handler(createMockEvent())

    expect(result).toEqual([])
  })

  it('returns averageRating 0 when no reviews', async () => {
    mocks.prisma.location.findMany.mockResolvedValue([{ id: '1', name: 'Park', reviews: [] }])

    const result = await handler(createMockEvent())

    expect(result[0].averageRating).toBe(0)
  })

  it('calculates correct average from multiple reviews', async () => {
    mocks.prisma.location.findMany.mockResolvedValue([
      {
        id: '1',
        reviews: [{ rating: 2 }, { rating: 4 }],
      },
    ])

    const result = await handler(createMockEvent())

    expect(result[0].averageRating).toBe(3)
  })

  it('filters by type query param', async () => {
    mocks.getQuery.mockReturnValue({ type: 'DOG_PARK' })
    mocks.prisma.location.findMany.mockResolvedValue([])

    await handler(createMockEvent())

    const callArgs = mocks.prisma.location.findMany.mock.calls[0][0]
    expect(callArgs.where.type).toBe('DOG_PARK')
  })

  it('filters by search query param with OR on name/description/address', async () => {
    mocks.getQuery.mockReturnValue({ search: 'central' })
    mocks.prisma.location.findMany.mockResolvedValue([])

    await handler(createMockEvent())

    const callArgs = mocks.prisma.location.findMany.mock.calls[0][0]
    expect(callArgs.where.OR).toEqual([
      { name: { contains: 'central', mode: 'insensitive' } },
      { description: { contains: 'central', mode: 'insensitive' } },
      { address: { contains: 'central', mode: 'insensitive' } },
    ])
  })

  it('combines type and search filters', async () => {
    mocks.getQuery.mockReturnValue({ type: 'DOG_PARK', search: 'big' })
    mocks.prisma.location.findMany.mockResolvedValue([])

    await handler(createMockEvent())

    const callArgs = mocks.prisma.location.findMany.mock.calls[0][0]
    expect(callArgs.where.type).toBe('DOG_PARK')
    expect(callArgs.where.OR).toBeDefined()
  })

  it('uses $queryRaw for radius search', async () => {
    mocks.getQuery.mockReturnValue({
      latitude: '40.7128',
      longitude: '-74.006',
      radiusKm: '10',
    })
    mocks.prisma.$queryRaw.mockResolvedValue([{ id: '1', name: 'Nearby Park' }])

    const result = await handler(createMockEvent())

    expect(mocks.prisma.$queryRaw).toHaveBeenCalled()
    expect(mocks.prisma.location.findMany).not.toHaveBeenCalled()
    expect(result).toEqual([{ id: '1', name: 'Nearby Park' }])
  })

  it('ignores non-string type param', async () => {
    mocks.getQuery.mockReturnValue({ type: 123 })
    mocks.prisma.location.findMany.mockResolvedValue([])

    await handler(createMockEvent())

    const callArgs = mocks.prisma.location.findMany.mock.calls[0][0]
    expect(callArgs.where.type).toBeUndefined()
  })

  it('ignores non-string search param', async () => {
    mocks.getQuery.mockReturnValue({ search: ['arr'] })
    mocks.prisma.location.findMany.mockResolvedValue([])

    await handler(createMockEvent())

    const callArgs = mocks.prisma.location.findMany.mock.calls[0][0]
    expect(callArgs.where.OR).toBeUndefined()
  })

  it('returns 503 when the database is unreachable', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.prisma.location.findMany.mockRejectedValue(
      Object.assign(new Error('Invalid `prisma.location.findMany()` invocation'), {
        code: 'ECONNREFUSED',
      })
    )

    await expect(handler(createMockEvent())).rejects.toMatchObject({ statusCode: 503 })
    consoleSpy.mockRestore()
  })

  it('rethrows non-connection errors unchanged', async () => {
    const error = new Error('boom')
    mocks.prisma.location.findMany.mockRejectedValue(error)

    await expect(handler(createMockEvent())).rejects.toBe(error)
  })
})
