import { describe, it, expect } from 'vitest'
import {
  PROFILE_PHOTO_MAX_BYTES,
  getAvatarUrl,
  resolveProfileUploadPreset,
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

describe('resolveProfileUploadPreset', () => {
  it('uses the dedicated profile preset when set', () => {
    expect(
      resolveProfileUploadPreset({ profileUploadPreset: 'profiles', uploadPreset: 'places' })
    ).toBe('profiles')
  })
  it('falls back to the shared preset when unset or empty', () => {
    expect(resolveProfileUploadPreset({ uploadPreset: 'places' })).toBe('places')
    expect(resolveProfileUploadPreset({ profileUploadPreset: '', uploadPreset: 'places' })).toBe(
      'places'
    )
    expect(resolveProfileUploadPreset({ profileUploadPreset: '  ', uploadPreset: 'places' })).toBe(
      'places'
    )
  })
  it('returns an empty string when nothing is configured', () => {
    expect(resolveProfileUploadPreset({})).toBe('')
  })
})
