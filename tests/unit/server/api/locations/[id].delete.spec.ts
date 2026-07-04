import { describe, it, expect, beforeEach } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/locations/[id].delete')).default

describe('DELETE /api/locations/[id]', () => {
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

  it('throws 400 when id is missing', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.getRouterParam.mockReturnValue(undefined)

    await expect(handler(createMockEvent())).rejects.toThrow('Location ID is required')
  })

  it('throws 404 when user not found', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.user.findUnique.mockResolvedValue(null)

    await expect(handler(createMockEvent())).rejects.toThrow('User not found')
  })

  it('throws 404 when location not found', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.prisma.location.findUnique.mockResolvedValue(null)

    await expect(handler(createMockEvent())).rejects.toThrow('Location not found')
  })

  it('throws 403 when user is not the creator', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.prisma.location.findUnique.mockResolvedValue({
      id: 'loc-1',
      createdById: 'other-user',
    })

    await expect(handler(createMockEvent())).rejects.toThrow('Forbidden')
    expect(mocks.createError).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'Forbidden',
    })
  })

  it('deletes location and returns success', async () => {
    mocks.requireAuth.mockResolvedValue('clerk_123')
    mocks.getRouterParam.mockReturnValue('loc-1')
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mocks.prisma.location.findUnique.mockResolvedValue({
      id: 'loc-1',
      createdById: 'user-1',
    })
    mocks.prisma.location.delete.mockResolvedValue({})

    const result = await handler(createMockEvent())

    expect(mocks.prisma.location.delete).toHaveBeenCalledWith({ where: { id: 'loc-1' } })
    expect(result).toEqual({ success: true })
  })
})
