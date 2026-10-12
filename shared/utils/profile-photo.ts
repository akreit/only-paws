export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const PROFILE_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

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

/**
 * True when `url` is an https image delivered from our Cloudinary cloud, points at `publicId`
 * and has an allowed image format. Uploads go straight from the browser to Cloudinary, so this
 * is the server-side check that a client can't store an arbitrary URL.
 */
export function isValidProfilePhoto(url: unknown, publicId: unknown, cloudName: unknown): boolean {
  if (
    typeof url !== 'string' ||
    typeof publicId !== 'string' ||
    typeof cloudName !== 'string' ||
    !cloudName ||
    !publicId ||
    publicId.length > 255 ||
    url.length > 2048
  ) {
    return false
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'res.cloudinary.com' ||
    parsed.username ||
    parsed.password ||
    parsed.port
  ) {
    return false
  }

  const prefix = `/${cloudName}/image/upload/`
  if (!parsed.pathname.startsWith(prefix)) return false

  const extension = parsed.pathname.split('.').pop()?.toLowerCase() ?? ''
  if (!PROFILE_PHOTO_EXTENSIONS.includes(extension)) return false

  // After the prefix: optional transformations / version, then <publicId>.<ext>
  const rest = decodeURIComponent(parsed.pathname.slice(prefix.length))
  return rest.endsWith(`/${publicId}.${extension}`) || rest === `${publicId}.${extension}`
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
