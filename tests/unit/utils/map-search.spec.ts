import { describe, expect, it } from 'vitest'
import { LocationType } from '~/types'
import {
  buildSearchDropdown,
  isSearchableQuery,
  locationToPlaceDetails,
  moveActiveIndex,
  placeToGooglePlaceDetails,
  type PlaceSuggestion,
} from '~/utils/map-search'
import { createMockLocation } from '../../fixtures/factories'

const suggestion = (id: string): PlaceSuggestion => ({
  placeId: id,
  mainText: `Main ${id}`,
  secondaryText: `Secondary ${id}`,
})

describe('isSearchableQuery', () => {
  it('requires two non-space characters', () => {
    expect(isSearchableQuery('')).toBe(false)
    expect(isSearchableQuery(' a ')).toBe(false)
    expect(isSearchableQuery('ab')).toBe(true)
  })
})

describe('buildSearchDropdown', () => {
  it('groups saved places before Google suggestions', () => {
    const model = buildSearchDropdown([createMockLocation({ id: 'a' })], [suggestion('g1')])

    expect(model.groups.map((g) => g.title)).toEqual(['Saved places', 'Google Maps'])
    expect(model.flat.map((i) => i.key)).toEqual(['saved:a', 'google:g1'])
    expect(model.flat[0]).toMatchObject({ kind: 'saved', locationType: LocationType.PARK })
  })

  it('omits empty groups', () => {
    expect(buildSearchDropdown([], [suggestion('g1')]).groups.map((g) => g.id)).toEqual(['google'])
    expect(buildSearchDropdown([], []).flat).toEqual([])
  })

  it('caps each group', () => {
    const saved = Array.from({ length: 8 }, (_, i) => createMockLocation({ id: `s${i}` }))
    const google = Array.from({ length: 8 }, (_, i) => suggestion(`g${i}`))

    const model = buildSearchDropdown(saved, google)
    expect(model.groups[0]!.items).toHaveLength(5)
    expect(model.groups[1]!.items).toHaveLength(5)

    const custom = buildSearchDropdown(saved, google, { saved: 1, google: 2 })
    expect(custom.flat).toHaveLength(3)
  })

  it('drops Google suggestions already saved, even beyond the saved cap', () => {
    const saved = Array.from({ length: 7 }, (_, i) =>
      createMockLocation({ id: `s${i}`, googlePlaceId: `p${i}` })
    )

    const model = buildSearchDropdown(saved, [
      suggestion('p6'),
      suggestion('p0'),
      suggestion('new'),
    ])

    expect(model.groups[1]!.items.map((i) => i.key)).toEqual(['google:new'])
  })

  it('ignores duplicate suggestions and does not count dropped ones against the cap', () => {
    const saved = [createMockLocation({ googlePlaceId: 'dup' })]
    const model = buildSearchDropdown(
      saved,
      [suggestion('dup'), suggestion('a'), suggestion('a'), suggestion('b')],
      { google: 2 }
    )

    expect(model.groups[1]!.items.map((i) => i.key)).toEqual(['google:a', 'google:b'])
  })
})

describe('moveActiveIndex', () => {
  it('returns -1 for an empty list', () => {
    expect(moveActiveIndex(0, 1, 0)).toBe(-1)
  })

  it('starts at the ends from no selection', () => {
    expect(moveActiveIndex(-1, 1, 3)).toBe(0)
    expect(moveActiveIndex(-1, -1, 3)).toBe(2)
    expect(moveActiveIndex(9, 1, 3)).toBe(0)
  })

  it('wraps in both directions', () => {
    expect(moveActiveIndex(2, 1, 3)).toBe(0)
    expect(moveActiveIndex(0, -1, 3)).toBe(2)
    expect(moveActiveIndex(1, 1, 3)).toBe(2)
    expect(moveActiveIndex(1, -1, 3)).toBe(0)
  })
})

describe('placeToGooglePlaceDetails', () => {
  const location = { lat: () => 1.5, lng: () => 2.5 }

  it('maps a fetched place', () => {
    expect(
      placeToGooglePlaceDetails({
        id: 'abc',
        displayName: 'Cafe',
        formattedAddress: '1 Main St',
        location,
        types: ['cafe'],
      })
    ).toEqual({
      placeId: 'abc',
      name: 'Cafe',
      address: '1 Main St',
      latitude: 1.5,
      longitude: 2.5,
      types: ['cafe'],
    })
  })

  it('falls back for missing fields', () => {
    expect(placeToGooglePlaceDetails({ location }, 'fallback')).toMatchObject({
      placeId: 'fallback',
      name: 'Untitled place',
      address: 'Address unavailable',
      types: [],
    })
    expect(placeToGooglePlaceDetails({ location, formattedAddress: 'Addr' })?.name).toBe('Addr')
  })

  it('returns null without a location', () => {
    expect(placeToGooglePlaceDetails({ id: 'x', location: null })).toBeNull()
  })
})

describe('locationToPlaceDetails', () => {
  it('prefers the Google place id and falls back to the local id', () => {
    const withGoogle = locationToPlaceDetails(createMockLocation({ googlePlaceId: 'g' }))
    expect(withGoogle).toMatchObject({ placeId: 'g', latitude: 40.7128, name: 'Test Dog Park' })
    expect(locationToPlaceDetails(createMockLocation({ id: 'local' })).placeId).toBe('local')
  })
})
