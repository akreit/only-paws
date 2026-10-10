import { describe, it, expect } from 'vitest'
import { createMockLocation } from '../../fixtures/factories'
import { LocationType, type GooglePlaceDetails } from '~/types'
import {
  buildLocationInputFromGooglePlace,
  formatGooglePlaceHours,
  inferLocationTypeFromGoogleTypes,
  locationToPlaceDetails,
  placeToGooglePlaceDetails,
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

describe('placeToGooglePlaceDetails', () => {
  const location = { lat: () => 1.5, lng: () => 2.5 }

  it('maps a fetched place including contact, hours and rating', () => {
    expect(
      placeToGooglePlaceDetails({
        id: 'abc',
        displayName: 'Cafe',
        formattedAddress: '1 Main St',
        location,
        types: ['cafe'],
        websiteURI: 'https://cafe.example',
        nationalPhoneNumber: '080 1234',
        regularOpeningHours: { weekdayDescriptions: ['Mon: 9-5', 'Tue: 9-5'] },
        rating: 4.5,
        userRatingCount: 12,
        googleMapsURI: 'https://maps.google.com/?cid=1',
      })
    ).toEqual({
      placeId: 'abc',
      name: 'Cafe',
      address: '1 Main St',
      latitude: 1.5,
      longitude: 2.5,
      website: 'https://cafe.example',
      phone: '080 1234',
      rating: 4.5,
      userRatingCount: 12,
      openingHours: ['Mon: 9-5', 'Tue: 9-5'],
      googleMapsUrl: 'https://maps.google.com/?cid=1',
      types: ['cafe'],
    })
  })

  it('feeds the Add form prefill (website, phone, hours)', () => {
    const details = placeToGooglePlaceDetails({
      location,
      websiteURI: 'https://w.example',
      nationalPhoneNumber: '1',
      regularOpeningHours: { weekdayDescriptions: ['Mon: 9-5', 'Tue: 9-5'] },
    })!

    expect(buildLocationInputFromGooglePlace(details)).toMatchObject({
      website: 'https://w.example',
      phone: '1',
      hours: 'Mon: 9-5 • Tue: 9-5',
    })
  })

  it('falls back for missing fields', () => {
    const minimal = placeToGooglePlaceDetails({ location, regularOpeningHours: {} }, 'fallback')
    expect(minimal).toMatchObject({
      placeId: 'fallback',
      name: 'Untitled place',
      address: 'Address unavailable',
      types: [],
    })
    expect(minimal?.openingHours).toBeUndefined()
    expect(minimal?.website).toBeUndefined()
    expect(placeToGooglePlaceDetails({ location, formattedAddress: 'Addr' })?.name).toBe('Addr')
  })

  it('returns null without a location', () => {
    expect(placeToGooglePlaceDetails({ id: 'x', location: null })).toBeNull()
  })
})

describe('locationToPlaceDetails', () => {
  it('uses the Google place id and leaves it empty when there is none', () => {
    const withGoogle = locationToPlaceDetails(createMockLocation({ googlePlaceId: 'g' }))
    expect(withGoogle).toMatchObject({ placeId: 'g', latitude: 40.7128, name: 'Test Dog Park' })
    expect(locationToPlaceDetails(createMockLocation({ id: 'local' })).placeId).toBe('')
  })
})
