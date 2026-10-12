import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'
import { createMockUser } from '../../../../fixtures/factories'

const mocks = setupServerMocks()

const putHandler = (await import('#server/api/users/profile-photo.put')).default
const deleteHandler = (await import('#server/api/users/profile-photo.delete')).default

const URL_OK = 'https://res.cloudinary.com/demo/image/upload/v1/avatars/abc.png'

function resetMocks() {
  vi.resetAllMocks()
  mocks.createError.mockImplementation((opts: { statusCode: number; message: string }) => {
    const err = new Error(opts.message) as Error & { statusCode: number }
    err.statusCode = opts.statusCode
    return err
  })
  mocks.useRuntimeConfig.mockReturnValue({ public: { cloudinaryCloudName: 'demo' } })
  mocks.requireAuth.mockResolvedValue('clerk_123')
  mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
}

describe('PUT /api/users/profile-photo', () => {
  beforeEach(resetMocks)

  it('requires authentication', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))
    await expect(putHandler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it.each([
    [{ url: 'https://evil.com/a.png', publicId: 'avatars/abc' }],
    [{ url: URL_OK, publicId: 'other' }],
    [{ url: URL_OK.replace('.png', '.gif'), publicId: 'avatars/abc' }],
    [{}],
    [null],
  ])('returns 400 for %j', async (body) => {
    mocks.readBody.mockResolvedValue(body)
    await expect(putHandler(createMockEvent())).rejects.toThrow('Invalid profile photo')
    expect(mocks.createError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('returns 500 when the cloud is not configured', async () => {
    mocks.useRuntimeConfig.mockReturnValue({ public: {} })
    mocks.readBody.mockResolvedValue({ url: URL_OK, publicId: 'avatars/abc' })
    await expect(putHandler(createMockEvent())).rejects.toThrow('not configured')
  })

  it('stores the photo on the signed-in user only', async () => {
    mocks.readBody.mockResolvedValue({
      url: URL_OK,
      publicId: 'avatars/abc',
      userId: 'someone-else',
    })
    mocks.prisma.user.update.mockResolvedValue(
      createMockUser({
        instagramHandle: null,
        profilePhotoUrl: URL_OK,
        profilePhotoPublicId: 'avatars/abc',
      })
    )

    const result = await putHandler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { profilePhotoUrl: URL_OK, profilePhotoPublicId: 'avatars/abc' },
    })
    expect(result).toMatchObject({ profilePhotoUrl: URL_OK, profilePhotoPublicId: 'avatars/abc' })
  })
})

describe('DELETE /api/users/profile-photo', () => {
  beforeEach(resetMocks)

  it('requires authentication', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Unauthorized'))
    await expect(deleteHandler(createMockEvent())).rejects.toThrow('Unauthorized')
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('clears the photo fields', async () => {
    mocks.prisma.user.update.mockResolvedValue(
      createMockUser({ profilePhotoUrl: null, profilePhotoPublicId: null })
    )

    const result = await deleteHandler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { profilePhotoUrl: null, profilePhotoPublicId: null },
    })
    expect(result).toMatchObject({ profilePhotoUrl: null, profilePhotoPublicId: null })
  })
})
