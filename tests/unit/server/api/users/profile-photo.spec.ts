import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent } from '../../../../helpers/server'
import { createMockUser } from '../../../../fixtures/factories'

const mocks = setupServerMocks()

const putHandler = (await import('#server/api/users/profile-photo.put')).default
const deleteHandler = (await import('#server/api/users/profile-photo.delete')).default

const PUBLIC_ID = 'only-paws/users/user-1/abc'
const URL_OK = `https://res.cloudinary.com/demo/image/upload/${PUBLIC_ID}.png`

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
    ['gif format', { publicId: PUBLIC_ID, format: 'gif' }],
    ['exe format', { publicId: PUBLIC_ID, format: 'exe' }],
    ['missing format', { publicId: PUBLIC_ID }],
    ['comma in id', { publicId: 'only-paws/users/user-1/a,b', format: 'png' }],
    ['dot-dot', { publicId: 'only-paws/users/user-1/../user-2/a', format: 'png' }],
    ['transformation', { publicId: 'only-paws/users/user-1/l_fetch:aHR0cA==', format: 'png' }],
    ['space', { publicId: 'only-paws/users/user-1/a b', format: 'png' }],
    ['leading slash', { publicId: '/only-paws/users/user-1/a', format: 'png' }],
    ['outside folder', { publicId: 'only-paws/places/abc', format: 'png' }],
    ['other user folder', { publicId: 'only-paws/users/user-2/abc', format: 'png' }],
    ['prefix lookalike', { publicId: 'only-paws/users/user-10/abc', format: 'png' }],
    ['no id', { format: 'png' }],
    ['null body', null],
  ])('returns 400 for %s', async (_label, body) => {
    mocks.readBody.mockResolvedValue(body)
    await expect(putHandler(createMockEvent())).rejects.toThrow('Invalid profile photo')
    expect(mocks.createError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('returns 500 when the cloud is not configured', async () => {
    mocks.useRuntimeConfig.mockReturnValue({ public: {} })
    mocks.readBody.mockResolvedValue({ publicId: PUBLIC_ID, format: 'png' })
    await expect(putHandler(createMockEvent())).rejects.toThrow('not configured')
  })

  it('ignores a client-supplied url and stores the server-built one', async () => {
    mocks.readBody.mockResolvedValue({
      url: 'https://res.cloudinary.com/demo/image/upload/e_blur:2000/x.png',
      publicId: PUBLIC_ID,
      format: 'png',
      userId: 'someone-else',
    })
    mocks.prisma.user.update.mockResolvedValue(
      createMockUser({ profilePhotoUrl: URL_OK, profilePhotoPublicId: PUBLIC_ID })
    )

    const result = await putHandler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { profilePhotoUrl: URL_OK, profilePhotoPublicId: PUBLIC_ID },
    })
    expect(result).toMatchObject({ profilePhotoUrl: URL_OK, profilePhotoPublicId: PUBLIC_ID })
  })

  it('normalises jpeg to jpg', async () => {
    mocks.readBody.mockResolvedValue({ publicId: PUBLIC_ID, format: 'JPEG' })
    mocks.prisma.user.update.mockResolvedValue(createMockUser())

    await putHandler(createMockEvent())

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        profilePhotoUrl: `https://res.cloudinary.com/demo/image/upload/${PUBLIC_ID}.jpg`,
        profilePhotoPublicId: PUBLIC_ID,
      },
    })
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
