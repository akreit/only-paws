import { describe, it, expect, beforeEach } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/locations/[id].get')).default

describe('GET /api/locations/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
  })

  it('throws 400 when id is missing', async () => {
    mocks.getRouterParam.mockReturnValue(undefined)

    await expect(handler(createMockEvent())).rejects.toThrow('Location ID is required')
    expect(mocks.createError).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Location ID is required',
    })
  })

  it('throws 404 when location not found', async () => {
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.location.findUnique.mockResolvedValue(null)

    await expect(handler(createMockEvent())).rejects.toThrow('Location not found')
    expect(mocks.createError).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Location not found',
    })
  })

  it('returns location with averageRating', async () => {
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.location.findUnique.mockResolvedValue({
      id: 'loc-1',
      name: 'Dog Park',
      reviews: [{ rating: 3 }, { rating: 5 }],
    })

    const result = await handler(createMockEvent())

    expect(result.averageRating).toBe(4)
    expect(result.name).toBe('Dog Park')
  })

  it('returns averageRating 0 when no reviews', async () => {
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.location.findUnique.mockResolvedValue({
      id: 'loc-1',
      reviews: [],
    })

    const result = await handler(createMockEvent())

    expect(result.averageRating).toBe(0)
  })

  it('calls findUnique with correct includes', async () => {
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.location.findUnique.mockResolvedValue({
      id: 'loc-1',
      reviews: [],
    })

    await handler(createMockEvent())

    expect(mocks.prisma.location.findUnique).toHaveBeenCalledWith({
      where: { id: 'loc-1' },
      include: {
        photos: {
          include: { uploader: true },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: { author: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            reviews: true,
            photos: true,
            favorites: true,
          },
        },
      },
    })
  })
})
