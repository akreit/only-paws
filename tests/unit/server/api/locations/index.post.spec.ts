import { describe, it, expect, beforeEach } from 'vitest'
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
    const body = {
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
})
