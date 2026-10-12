export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const PROFILE_PHOTO_ACCEPT = PROFILE_PHOTO_TYPES.join(',')

/** Returns an error message, or null when the file may be uploaded. */
export function validateProfilePhotoFile(file: { type: string; size: number }): string | null {
  if (!(PROFILE_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return 'Please choose a JPEG, PNG or WebP image'
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return 'The image must be 5 MB or smaller'
  }
  return null
}

/** Inserts a square face-aware crop transform into a Cloudinary delivery URL. */
export function squareCropUrl(url: string, size = 400): string {
  const marker = '/upload/'
  const index = url.indexOf(marker)
  if (index === -1 || !url.includes('res.cloudinary.com')) return url
  const px = Math.max(1, Math.round(size))
  const transform = `c_fill,g_face,w_${px},h_${px}`
  const head = url.slice(0, index + marker.length)
  const tail = url.slice(index + marker.length)
  return `${head}${transform}/${tail}`
}

/** The avatar to show for a user: their uploaded profile photo, else the Clerk avatar. */
export function getAvatarUrl(
  user: { profilePhotoUrl?: string | null; avatarUrl?: string | null } | null | undefined,
  size = 400
): string | null {
  if (user?.profilePhotoUrl) return squareCropUrl(user.profilePhotoUrl, size)
  return user?.avatarUrl || null
}

/**
 * Upload preset for profile photos: the dedicated profile preset
 * (CLOUDINARY_PROFILE_UPLOAD_PRESET) when set, otherwise the shared place-photo preset.
 */
export function resolveProfileUploadPreset(config: {
  profileUploadPreset?: unknown
  uploadPreset?: unknown
}): string {
  const dedicated =
    typeof config.profileUploadPreset === 'string' ? config.profileUploadPreset.trim() : ''
  if (dedicated) return dedicated
  return typeof config.uploadPreset === 'string' ? config.uploadPreset : ''
}
