import { LocationType } from '~/types'

export const AMENITIES_OPTIONS = [
  'Water bowls',
  'Dog treats',
  'Outdoor seating',
  'Patio',
  'Dog menu',
  'Waste bags',
  'Fenced area',
  'Agility equipment',
  'Swimming area',
  'Shade',
]

export const MAX_PHOTOS_PER_LOCATION = 50
export const MAX_PHOTO_SIZE_MB = 10

export const MIN_RATING = 1
export const MAX_RATING = 5

export const DEFAULT_RADIUS_KM = 10
export const MIN_RADIUS_KM = 1
export const MAX_RADIUS_KM = 50

export const DEFAULT_MAP_ZOOM = 13

export const DEFAULT_MAP_CENTER = {
  lat: 40.7128,
  lng: -74.006,
}

export const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  [LocationType.RESTAURANT]: '#EF4444',
  [LocationType.PARK]: '#10B981',
  [LocationType.STORE]: '#3B82F6',
  [LocationType.HOTEL]: '#8B5CF6',
  [LocationType.BEACH]: '#06B6D4',
  [LocationType.CAFE]: '#F59E0B',
  [LocationType.BAR]: '#EC4899',
  [LocationType.TRAINING_CENTER]: '#6366F1',
  [LocationType.GROOMER]: '#14B8A6',
  [LocationType.VETERINARIAN]: '#F43F5E',
  [LocationType.OTHER]: '#6B7280',
}

export const LOCATION_TYPE_ICONS: Record<LocationType, string> = {
  [LocationType.RESTAURANT]: '🍽️',
  [LocationType.PARK]: '🌳',
  [LocationType.STORE]: '🏪',
  [LocationType.HOTEL]: '🏨',
  [LocationType.BEACH]: '🏖️',
  [LocationType.CAFE]: '☕',
  [LocationType.BAR]: '🍺',
  [LocationType.TRAINING_CENTER]: '🎓',
  [LocationType.GROOMER]: '✂️',
  [LocationType.VETERINARIAN]: '🏥',
  [LocationType.OTHER]: '📍',
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  [LocationType.RESTAURANT]: 'Restaurant',
  [LocationType.PARK]: 'Park',
  [LocationType.STORE]: 'Store',
  [LocationType.HOTEL]: 'Hotel',
  [LocationType.BEACH]: 'Beach',
  [LocationType.CAFE]: 'Café',
  [LocationType.BAR]: 'Bar',
  [LocationType.TRAINING_CENTER]: 'Training Center',
  [LocationType.GROOMER]: 'Groomer',
  [LocationType.VETERINARIAN]: 'Veterinarian',
  [LocationType.OTHER]: 'Other',
}
