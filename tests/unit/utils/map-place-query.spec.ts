import { describe, expect, it } from 'vitest'
import { parsePlaceQuery, withPlaceQuery } from '~/utils/map-place-query'

describe('parsePlaceQuery', () => {
  it('reads a string id', () => {
    expect(parsePlaceQuery({ place: 'abc' })).toBe('abc')
  })

  it('uses the first value of a repeated param', () => {
    expect(parsePlaceQuery({ place: ['a', 'b'] })).toBe('a')
  })

  it('returns null when missing or empty', () => {
    expect(parsePlaceQuery({})).toBeNull()
    expect(parsePlaceQuery({ place: null })).toBeNull()
    expect(parsePlaceQuery({ place: '' })).toBeNull()
    expect(parsePlaceQuery({ place: [] })).toBeNull()
  })
})

describe('withPlaceQuery', () => {
  it('sets place and preserves other params', () => {
    expect(withPlaceQuery({ q: 'x' }, 'abc')).toEqual({ q: 'x', place: 'abc' })
  })

  it('replaces an existing place', () => {
    expect(withPlaceQuery({ place: ['a', 'b'] }, 'c')).toEqual({ place: 'c' })
  })

  it('removes place and preserves other params', () => {
    expect(withPlaceQuery({ q: 'x', place: 'abc' }, null)).toEqual({ q: 'x' })
  })

  it('does not mutate the input', () => {
    const query = { place: 'abc' }
    withPlaceQuery(query, null)
    expect(query).toEqual({ place: 'abc' })
  })
})
