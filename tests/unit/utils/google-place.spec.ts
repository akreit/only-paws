import { describe, it, expect } from 'vitest'
import { LocationType, type GooglePlaceDetails } from '~/types'
import {
  buildLocationInputFromGooglePlace,
  formatGooglePlaceHours,
  inferLocationTypeFromGoogleTypes,
} from '~/utils/google-place'

describe('inferLocationTypeFromGoogleTypes', () => {
  it('maps veterinary places correctly', () => {
    expect(inferLocationTypeFromGoogleTypes(['point_of_interest', 'veterinary_care'])).toBe(
      LocationType.VETERINARIAN
    )
  })

  it('prefers more specific pet-related types before generic store types', () => {
    expect(inferLocationTypeFromGoogleTypes(['store', 'pet_groomer'])).toBe(LocationType.GROOMER)
  })

  it('falls back to OTHER when no known place types are present', () => {
    expect(inferLocationTypeFromGoogleTypes(['point_of_interest', 'establishment'])).toBe(
      LocationType.OTHER
    )
  })
})

describe('formatGooglePlaceHours', () => {
  it('returns undefined when hours are missing', () => {
    expect(formatGooglePlaceHours()).toBeUndefined()
  })

  it('joins weekday lines into a single display string', () => {
    expect(formatGooglePlaceHours(['Mon: 9:00 AM – 5:00 PM', 'Tue: 9:00 AM – 5:00 PM'])).toBe(
      'Mon: 9:00 AM – 5:00 PM • Tue: 9:00 AM – 5:00 PM'
    )
  })
})

describe('buildLocationInputFromGooglePlace', () => {
  it('converts Google place details into a location create payload', () => {
    const place: GooglePlaceDetails = {
      placeId: 'google-place-123',
      name: 'Paws & Relax Café',
      address: '123 Bark Street',
      latitude: 40.7128,
      longitude: -74.006,
      website: 'https://example.com',
      phone: '+1 555-1234',
      openingHours: ['Mon: 9:00 AM – 5:00 PM', 'Tue: 9:00 AM – 5:00 PM'],
      types: ['cafe', 'food', 'point_of_interest'],
    }

    expect(buildLocationInputFromGooglePlace(place)).toEqual({
      googlePlaceId: 'google-place-123',
      name: 'Paws & Relax Café',
      type: LocationType.CAFE,
      address: '123 Bark Street',
      latitude: 40.7128,
      longitude: -74.006,
      website: 'https://example.com',
      phone: '+1 555-1234',
      hours: 'Mon: 9:00 AM – 5:00 PM • Tue: 9:00 AM – 5:00 PM',
    })
  })
})
