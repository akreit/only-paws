import { describe, expect, it } from 'vitest'
import { LocationType } from '~/types'
import {
  MAX_GOOGLE_RESULTS,
  MAX_SAVED_RESULTS,
  buildSearchDropdown,
  isSearchableQuery,
  moveActiveIndex,
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
    expect(model.groups[0]!.items).toHaveLength(MAX_SAVED_RESULTS)
    expect(model.groups[1]!.items).toHaveLength(MAX_GOOGLE_RESULTS)
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
    const extra = Array.from({ length: MAX_GOOGLE_RESULTS }, (_, i) => suggestion(`x${i}`))
    const model = buildSearchDropdown(saved, [
      suggestion('dup'),
      suggestion('a'),
      suggestion('a'),
      ...extra,
    ])

    expect(model.groups[1]!.items.map((i) => i.key)).toEqual([
      'google:a',
      ...extra.slice(0, MAX_GOOGLE_RESULTS - 1).map((e) => `google:${e.placeId}`),
    ])
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
