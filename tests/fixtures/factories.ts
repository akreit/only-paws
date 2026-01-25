import type { Location, LocationType } from '~/types'

export function createMockLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'test-location-1',
    name: 'Test Dog Park',
    type: 'PARK' as LocationType,
    description: 'A great place for dogs',
    address: '123 Test Street, Test City, TC 12345',
    latitude: 40.7128,
    longitude: -74.006,
    website: 'https://example.com',
    phone: '+1 555-123-4567',
    hours: '6:00 AM - 10:00 PM',
    leashRequired: false,
    breedRestrictions: null,
    offLeashArea: true,
    amenities: JSON.stringify(['Water bowls', 'Waste bags']),
    createdById: 'test-user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-1',
    clerkUserId: 'clerk_test_user_1',
    email: 'test@example.com',
    username: 'testuser',
    bio: 'Test user bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createMockReview(overrides = {}) {
  return {
    id: 'test-review-1',
    rating: 5,
    comment: 'Great location!',
    locationId: 'test-location-1',
    authorId: 'test-user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createMockPhoto(overrides = {}) {
  return {
    id: 'test-photo-1',
    url: 'https://res.cloudinary.com/test/image/upload/v1/test.jpg',
    caption: 'Test photo',
    publicId: 'test/photo1',
    locationId: 'test-location-1',
    uploaderId: 'test-user-1',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

