import { describe, it, expect } from 'vitest'
import {
  PROFILE_PHOTO_MAX_BYTES,
  getAvatarUrl,
  isValidProfilePhoto,
  squareCropUrl,
  validateProfilePhotoFile,
} from '#shared/utils/profile-photo'

const URL_OK = 'https://res.cloudinary.com/demo/image/upload/v123/avatars/abc.jpg'

describe('validateProfilePhotoFile', () => {
  it('accepts JPEG, PNG and WebP up to 5 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validateProfilePhotoFile({ type, size: PROFILE_PHOTO_MAX_BYTES })).toBeNull()
    }
  })

  it('rejects other types and oversized files', () => {
    expect(validateProfilePhotoFile({ type: 'image/gif', size: 10 })).toMatch(/JPEG, PNG or WebP/)
    expect(
      validateProfilePhotoFile({ type: 'image/png', size: PROFILE_PHOTO_MAX_BYTES + 1 })
    ).toMatch(/5 MB/)
  })
})

describe('isValidProfilePhoto', () => {
  it('accepts an image on our cloud', () => {
    expect(isValidProfilePhoto(URL_OK, 'avatars/abc', 'demo')).toBe(true)
    expect(
      isValidProfilePhoto('https://res.cloudinary.com/demo/image/upload/abc.webp', 'abc', 'demo')
    ).toBe(true)
  })

  it.each([
    ['other cloud', URL_OK.replace('/demo/', '/evil/'), 'avatars/abc'],
    ['http', URL_OK.replace('https', 'http'), 'avatars/abc'],
    ['other host', 'https://evil.com/demo/image/upload/v1/avatars/abc.jpg', 'avatars/abc'],
    ['lookalike host', 'https://res.cloudinary.com.evil.com/demo/image/upload/abc.jpg', 'abc'],
    ['credentials', 'https://x@res.cloudinary.com/demo/image/upload/abc.jpg', 'abc'],
    ['video', URL_OK.replace('/image/', '/video/'), 'avatars/abc'],
    ['gif', URL_OK.replace('.jpg', '.gif'), 'avatars/abc'],
    ['mismatched id', URL_OK, 'other/id'],
    ['not a url', 'nope', 'abc'],
    ['empty id', URL_OK, ''],
    ['non-string', 5, 'abc'],
  ])('rejects %s', (_label, url, publicId) => {
    expect(isValidProfilePhoto(url, publicId, 'demo')).toBe(false)
  })

  it('rejects when no cloud is configured', () => {
    expect(isValidProfilePhoto(URL_OK, 'avatars/abc', undefined)).toBe(false)
  })
})

describe('squareCropUrl', () => {
  it('inserts the face-aware square transform after /upload/', () => {
    expect(squareCropUrl(URL_OK)).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_400,h_400/v123/avatars/abc.jpg'
    )
    expect(squareCropUrl(URL_OK, 64)).toContain('/c_fill,g_face,w_64,h_64/')
  })

  it('leaves non-Cloudinary urls alone', () => {
    expect(squareCropUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
  })
})

describe('getAvatarUrl', () => {
  it('prefers the cropped profile photo over the Clerk avatar', () => {
    expect(
      getAvatarUrl({ profilePhotoUrl: URL_OK, avatarUrl: 'https://clerk/a.png' }, 80)
    ).toContain('w_80,h_80')
  })

  it('falls back to the Clerk avatar, then null', () => {
    expect(getAvatarUrl({ profilePhotoUrl: null, avatarUrl: 'https://clerk/a.png' })).toBe(
      'https://clerk/a.png'
    )
    expect(getAvatarUrl({})).toBeNull()
    expect(getAvatarUrl(undefined)).toBeNull()
  })
})
