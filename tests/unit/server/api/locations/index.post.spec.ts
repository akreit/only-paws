import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/locations/index.post')).default

describe('POST /api/locations', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
  })

  it('throws when unauthenticated', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))

    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
  })

  it('throws 404 when DB user not found', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue(null)

    await expect(handler(createMockEvent())).rejects.toThrow('User not found')
    expect(mocks.createError).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'User not found',
    })
  })

  it('throws 400 when required fields missing', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1', clerkUserId: 'clerk_123' })
    mocks.readBody.mockResolvedValue({ name: 'Park' }) // missing type, address, lat, lng

    await expect(handler(createMockEvent())).rejects.toThrow('Missing required fields')
    expect(mocks.createError).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Missing required fields',
    })
  })

  it('creates location with correct data and createdById', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1', clerkUserId: 'clerk_123' })
    mocks.prisma.location.findUnique.mockResolvedValue(null)
    const body = {
      googlePlaceId: 'google-place-123',
      name: 'Dog Park',
      type: 'DOG_PARK',
      address: '123 Main St',
      latitude: '40.7128',
      longitude: '-74.006',
      description: 'A great park',
      website: null,
      phone: null,
      hours: null,
      leashRequired: true,
      breedRestrictions: false,
      offLeashArea: true,
    }
    mocks.readBody.mockResolvedValue(body)
    const created = { id: 'loc-1', ...body }
    mocks.prisma.location.create.mockResolvedValue(created)

    const result = await handler(createMockEvent())

    expect(mocks.prisma.location.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googlePlaceId: 'google-place-123',
          name: 'Dog Park',
          type: 'DOG_PARK',
          address: '123 Main St',
          createdById: 'user-1',
        }),
      })
    )
    expect(result).toEqual(created)
  })

  it('parses latitude and longitude as floats', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.prisma.location.findUnique.mockResolvedValue(null)
    mocks.readBody.mockResolvedValue({
      name: 'Park',
      type: 'DOG_PARK',
      address: '123 St',
      latitude: '40.7128',
      longitude: '-74.006',
    })
    mocks.prisma.location.create.mockResolvedValue({})

    await handler(createMockEvent())

    const createData = mocks.prisma.location.create.mock.calls[0][0].data
    expect(createData.latitude).toBe(40.7128)
    expect(createData.longitude).toBe(-74.006)
  })

  it('stringifies amenities array to JSON', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.prisma.location.findUnique.mockResolvedValue(null)
    mocks.readBody.mockResolvedValue({
      name: 'Park',
      type: 'DOG_PARK',
      address: '123 St',
      latitude: '0',
      longitude: '0',
      amenities: ['water', 'shade'],
    })
    mocks.prisma.location.create.mockResolvedValue({})

    await handler(createMockEvent())

    const createData = mocks.prisma.location.create.mock.calls[0][0].data
    expect(createData.amenities).toBe(JSON.stringify(['water', 'shade']))
  })

  it('sets amenities to null when not provided', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.prisma.location.findUnique.mockResolvedValue(null)
    mocks.readBody.mockResolvedValue({
      name: 'Park',
      type: 'DOG_PARK',
      address: '123 St',
      latitude: '0',
      longitude: '0',
    })
    mocks.prisma.location.create.mockResolvedValue({})

    await handler(createMockEvent())

    const createData = mocks.prisma.location.create.mock.calls[0][0].data
    expect(createData.amenities).toBeNull()
  })

  it('returns the created location', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.prisma.location.findUnique.mockResolvedValue(null)
    mocks.readBody.mockResolvedValue({
      name: 'Park',
      type: 'DOG_PARK',
      address: '123 St',
      latitude: '0',
      longitude: '0',
    })
    const created = { id: 'loc-1', name: 'Park' }
    mocks.prisma.location.create.mockResolvedValue(created)

    const result = await handler(createMockEvent())

    expect(result).toEqual(created)
  })

  it('returns an existing location when the googlePlaceId already exists', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.readBody.mockResolvedValue({
      googlePlaceId: 'google-place-123',
      name: 'Park',
      type: 'DOG_PARK',
      address: '123 St',
      latitude: '0',
      longitude: '0',
    })

    const existingLocation = { id: 'loc-existing', googlePlaceId: 'google-place-123', name: 'Park' }
    mocks.prisma.location.findUnique.mockResolvedValue(existingLocation)

    const result = await handler(createMockEvent())

    expect(mocks.prisma.location.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { googlePlaceId: 'google-place-123' },
      })
    )
    expect(mocks.prisma.location.create).not.toHaveBeenCalled()
    expect(result).toEqual(existingLocation)
  })

  it('does not try to deduplicate when googlePlaceId is blank', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.readBody.mockResolvedValue({
      googlePlaceId: '   ',
      name: 'Park',
      type: 'DOG_PARK',
      address: '123 St',
      latitude: '0',
      longitude: '0',
    })
    mocks.prisma.location.create.mockResolvedValue({ id: 'loc-1' })

    await handler(createMockEvent())

    expect(mocks.prisma.location.findUnique).not.toHaveBeenCalled()

    const createData = mocks.prisma.location.create.mock.calls[0][0].data
    expect(createData.googlePlaceId).toBeUndefined()
  })
})
