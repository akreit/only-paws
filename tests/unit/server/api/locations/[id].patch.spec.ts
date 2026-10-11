import { describe, it, expect, beforeEach } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/locations/[id].patch')).default

describe('PATCH /api/locations/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
  })

  async function expectStatus(statusCode: number, message: string) {
    await expect(handler(createMockEvent())).rejects.toThrow(message)
    expect(mocks.createError).toHaveBeenCalledWith(expect.objectContaining({ statusCode, message }))
    expect(mocks.prisma.location.update).not.toHaveBeenCalled()
  }

  it('rejects signed-out users', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))

    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.location.update).not.toHaveBeenCalled()
  })

  it('returns 400 when the id is missing', async () => {
    mocks.getRouterParam.mockReturnValue(undefined)
    mocks.readBody.mockResolvedValue({ type: 'PARK' })

    await expectStatus(400, 'Location ID is required')
  })

  it('returns 400 for an invalid type', async () => {
    mocks.readBody.mockResolvedValue({ type: 'NOPE' })

    await expectStatus(400, 'Invalid location type')
  })

  it('returns 400 for invalid field values', async () => {
    mocks.readBody.mockResolvedValue({ leashRequired: 'yes' })

    await expectStatus(400, 'leashRequired must be a boolean or null')
  })

  it('returns 400 for an unknown amenity', async () => {
    mocks.readBody.mockResolvedValue({ amenities: ['Patio', 'Hot tub'] })

    await expectStatus(400, 'amenities must be an array of known amenities or null')
  })

  it('returns 400 for an empty body', async () => {
    mocks.readBody.mockResolvedValue({})

    await expectStatus(400, 'At least one field to update is required')
  })

  it('rejects immutable fields', async () => {
    mocks.readBody.mockResolvedValue({ type: 'PARK', name: 'Renamed', createdById: 'user-2' })

    await expectStatus(400, 'Fields cannot be updated: name, createdById')
  })

  it('returns 404 when the location does not exist', async () => {
    mocks.readBody.mockResolvedValue({ type: 'PARK' })
    mocks.prisma.location.findUnique.mockResolvedValue(null)

    await expectStatus(404, 'Location not found')
  })

  it('updates only the validated fields and returns the detail shape with averageRating', async () => {
    mocks.readBody.mockResolvedValue({
      type: 'CAFE',
      leashRequired: true,
      breedRestrictions: '  ',
      amenities: ['Patio', 'Patio'],
    })
    mocks.prisma.location.findUnique.mockResolvedValue({ id: 'loc-1' })
    mocks.prisma.location.update.mockResolvedValue({
      id: 'loc-1',
      type: 'CAFE',
      reviews: [{ rating: 4 }, { rating: 5 }],
    })

    const result = await handler(createMockEvent())

    expect(mocks.prisma.location.update).toHaveBeenCalledWith({
      where: { id: 'loc-1' },
      data: {
        type: 'CAFE',
        leashRequired: true,
        breedRestrictions: null,
        amenities: JSON.stringify(['Patio']),
      },
      include: {
        photos: { include: { uploader: true }, orderBy: { createdAt: 'desc' } },
        reviews: { include: { author: true }, orderBy: { createdAt: 'desc' } },
        _count: { select: { reviews: true, photos: true, favorites: true } },
      },
    })
    expect(result).toMatchObject({ id: 'loc-1', type: 'CAFE', averageRating: 4.5 })
  })
})
