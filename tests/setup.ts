import { beforeAll, vi } from 'vitest'
import { AMENITIES_OPTIONS } from '#shared/utils/amenities'
import { MAX_REVIEW_COMMENT_LENGTH, validateRating } from '#shared/utils/validation'
import { instagramProfileUrl, parseInstagramHandle } from '#shared/utils/instagram'
import {
  getAvatarUrl,
  resolveProfileUploadPreset,
  squareCropUrl,
  validateProfilePhotoFile,
} from '#shared/utils/profile-photo'

// Nuxt auto-imports shared/utils in the app and Nitro; expose them the same way here
vi.stubGlobal('AMENITIES_OPTIONS', AMENITIES_OPTIONS)
vi.stubGlobal('MAX_REVIEW_COMMENT_LENGTH', MAX_REVIEW_COMMENT_LENGTH)
vi.stubGlobal('validateRating', validateRating)
vi.stubGlobal('parseInstagramHandle', parseInstagramHandle)
vi.stubGlobal('instagramProfileUrl', instagramProfileUrl)
vi.stubGlobal('getAvatarUrl', getAvatarUrl)
vi.stubGlobal('squareCropUrl', squareCropUrl)
vi.stubGlobal('resolveProfileUploadPreset', resolveProfileUploadPreset)
vi.stubGlobal('validateProfilePhotoFile', validateProfilePhotoFile)

// Mock environment variables
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_mock'
process.env.CLERK_SECRET_KEY = 'sk_test_mock'
process.env.GOOGLE_MAPS_API_KEY = 'mock_google_maps_key'
process.env.CLOUDINARY_CLOUD_NAME = 'mock_cloud'
process.env.CLOUDINARY_API_KEY = 'mock_api_key'
process.env.CLOUDINARY_API_SECRET = 'mock_api_secret'

// Mock window.google
beforeAll(() => {
  if (typeof window !== 'undefined') {
    window.google = {
      maps: {
        Map: vi.fn() as unknown as typeof google.maps.Map,
        Marker: vi.fn() as unknown as typeof google.maps.Marker,
        LatLngBounds: vi.fn() as unknown as typeof google.maps.LatLngBounds,
        Geocoder: vi.fn() as unknown as typeof google.maps.Geocoder,
        SymbolPath: {
          CIRCLE: 0 as google.maps.SymbolPath.CIRCLE,
        },
      },
    } as typeof google
  }
})
