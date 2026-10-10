import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))

vi.mock('@clerk/nuxt/server', () => ({
  clerkClient: () => ({ users: { getUser } }),
}))

const mocks = setupServerMocks()

const handler = (await import('#server/api/users/sync.post')).default

const clerkUser = {
  primaryEmailAddress: { emailAddress: 'a@b.c' },
  username: 'me',
  imageUrl: 'http://img',
}

describe('POST /api/users/sync', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireAuth.mockResolvedValue('clerk_auth')
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) =>
      Object.assign(new Error(opts.message), { statusCode: opts.statusCode })
    )
    getUser.mockResolvedValue(clerkUser)
  })

  it('requires authentication', async () => {
    mocks.requireAuth.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    )

    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(getUser).not.toHaveBeenCalled()
    expect(mocks.prisma.user.upsert).not.toHaveBeenCalled()
  })

  it('upserts the profile fields loaded from Clerk', async () => {
    mocks.prisma.user.upsert.mockResolvedValue({ id: 'u1' })

    expect(await handler(createMockEvent())).toEqual({ id: 'u1' })
    expect(getUser).toHaveBeenCalledWith('clerk_auth')
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

  it('ignores a malicious request body', async () => {
    mocks.readBody.mockResolvedValue({
      clerkUserId: 'victim',
      email: 'evil@example.com',
      username: 'evil',
      avatarUrl: 'http://evil',
    })
    mocks.prisma.user.upsert.mockResolvedValue({ id: 'u1' })

    await handler(createMockEvent())

    expect(mocks.readBody).not.toHaveBeenCalled()
    const args = mocks.prisma.user.upsert.mock.calls[0][0]
    expect(args.where).toEqual({ clerkUserId: 'clerk_auth' })
    expect(args.update).toEqual({ email: 'a@b.c', username: 'me', avatarUrl: 'http://img' })
    expect(args.create.email).toBe('a@b.c')
  })

  it('stores null for missing Clerk fields', async () => {
    getUser.mockResolvedValue({ primaryEmailAddress: null, username: null, imageUrl: undefined })
    mocks.prisma.user.upsert.mockResolvedValue({ id: 'u1' })

    await handler(createMockEvent())

    expect(mocks.prisma.user.upsert.mock.calls[0][0].update).toEqual({
      email: null,
      username: null,
      avatarUrl: null,
    })
  })

  it('returns a 502 when the Clerk lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    getUser.mockRejectedValue(new Error('clerk down'))

    await expect(handler(createMockEvent())).rejects.toMatchObject({
      statusCode: 502,
      message: 'Failed to load user from Clerk',
    })
    expect(mocks.prisma.user.upsert).not.toHaveBeenCalled()
  })
})
