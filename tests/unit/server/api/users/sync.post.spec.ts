import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const mocks = setupServerMocks()

const handler = (await import('#server/api/users/sync.post')).default

describe('POST /api/users/sync', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireAuth.mockResolvedValue('clerk_auth')
  })

  it('requires authentication', async () => {
    mocks.requireAuth.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    )
    mocks.readBody.mockResolvedValue({ clerkUserId: 'victim', email: 'x@y.z' })

    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.upsert).not.toHaveBeenCalled()
  })

  it('uses the authenticated id and ignores clerkUserId in the body', async () => {
    mocks.readBody.mockResolvedValue({
      clerkUserId: 'victim',
      email: 'a@b.c',
      username: 'me',
      avatarUrl: 'http://img',
    })
    mocks.prisma.user.upsert.mockResolvedValue({ id: 'u1' })

    expect(await handler(createMockEvent())).toEqual({ id: 'u1' })
    expect(mocks.prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_auth' },
      update: { email: 'a@b.c', username: 'me', avatarUrl: 'http://img' },
      create: {
        clerkUserId: 'clerk_auth',
        email: 'a@b.c',
        username: 'me',
        avatarUrl: 'http://img',
      },
    })
  })

  it('works with an empty body', async () => {
    mocks.readBody.mockResolvedValue(undefined)
    mocks.prisma.user.upsert.mockResolvedValue({ id: 'u1' })

    await handler(createMockEvent())
    expect(mocks.prisma.user.upsert.mock.calls[0][0].where).toEqual({ clerkUserId: 'clerk_auth' })
  })
})
