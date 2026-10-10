import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../helpers/server'
import { requireDbUser } from '#server/utils/user'

const mocks = setupServerMocks()

describe('requireDbUser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireAuth.mockResolvedValue('clerk_123')
  })

  it('propagates auth failures without touching the database', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))

    await expect(requireDbUser(createMockEvent() as never)).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.upsert).not.toHaveBeenCalled()
  })

  it('gets or creates the user by clerkUserId', async () => {
    const user = { id: 'u1', clerkUserId: 'clerk_123' }
    mocks.prisma.user.upsert.mockResolvedValue(user)

    expect(await requireDbUser(createMockEvent() as never)).toEqual(user)
    expect(mocks.prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
      update: {},
      create: { clerkUserId: 'clerk_123' },
    })
  })

  it('maps connection errors to a 503', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) =>
      Object.assign(new Error(opts.message), { statusCode: opts.statusCode })
    )
    mocks.prisma.user.upsert.mockRejectedValue(Object.assign(new Error('x'), { code: 'P1001' }))

    await expect(requireDbUser(createMockEvent() as never)).rejects.toMatchObject({
      statusCode: 503,
    })
  })
})
