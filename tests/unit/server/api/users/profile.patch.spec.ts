import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'
import { createMockUser } from '../../../../fixtures/factories'

const mocks = setupServerMocks()

const handler = (await import('#server/api/users/profile.patch')).default

describe('PATCH /api/users/profile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    })
    mocks.requireAuth.mockResolvedValue('clerk_123')
  })

  it('throws when unauthenticated', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))
    await expect(handler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid input', async () => {
    mocks.readBody.mockResolvedValue({ bio: 'a'.repeat(501) })

    await expect(handler(createMockEvent())).rejects.toThrow('Invalid profile')
    expect(mocks.createError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('returns 404 when the user does not exist', async () => {
    mocks.readBody.mockResolvedValue({ bio: 'hi' })
    mocks.prisma.user.findUnique.mockResolvedValue(null)

    await expect(handler(createMockEvent())).rejects.toThrow('User not found')
    expect(mocks.createError).toHaveBeenCalledWith({ statusCode: 404, message: 'User not found' })
  })

  it('updates only whitelisted fields and returns the user shape', async () => {
    mocks.readBody.mockResolvedValue({
      bio: ' Hi 🐶 ',
      hasDog: true,
      dogName: 'Rex',
      lookingFor: ['FRIENDS', 'FRIENDS'],
      clerkUserId: 'evil',
      email: 'evil@example.com',
    })
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1', hasDog: false })
    const updated = {
      ...createMockUser(),
      bio: 'Hi 🐶',
      homeCity: null,
      hasDog: true,
      dogName: 'Rex',
      dogBreed: null,
      lookingFor: ['FRIENDS'],
      extra: 'not returned',
    }
    mocks.prisma.user.update.mockResolvedValue(updated)

    const result = await handler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
      data: { bio: 'Hi 🐶', hasDog: true, dogName: 'Rex', lookingFor: ['FRIENDS'] },
    })
    expect(result).not.toHaveProperty('extra')
    expect(result).toMatchObject({
      id: 'test-user-1',
      bio: 'Hi 🐶',
      homeCity: null,
      hasDog: true,
      dogName: 'Rex',
      dogBreed: null,
      lookingFor: ['FRIENDS'],
    })
  })

  it('clears dog details when hasDog is false', async () => {
    mocks.readBody.mockResolvedValue({ hasDog: false, dogName: 'Rex' })
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1', hasDog: true })
    mocks.prisma.user.update.mockResolvedValue(createMockUser())

    await handler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
      data: { hasDog: false, dogName: null, dogBreed: null },
    })
  })

  it('ignores dog details for a stored user without a dog unless hasDog is enabled', async () => {
    mocks.readBody.mockResolvedValue({ dogName: 'Rex', homeCity: 'Berlin' })
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1', hasDog: false })
    mocks.prisma.user.update.mockResolvedValue(createMockUser())

    await handler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { clerkUserId: 'clerk_123' },
      data: { homeCity: 'Berlin' },
    })
  })
})
