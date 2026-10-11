import { describe, expect, it } from 'vitest'
import { parseLocationUpdate } from '#server/utils/location-update'

describe('parseLocationUpdate', () => {
  it.each([null, undefined, 'PARK', 5, ['PARK']])('rejects a non-object body (%j)', (body) => {
    expect(parseLocationUpdate(body)).toEqual({ error: 'Invalid input' })
  })

  it('requires at least one field', () => {
    expect(parseLocationUpdate({})).toEqual({
      error: 'At least one field to update is required',
    })
  })

  it.each(['name', 'address', 'latitude', 'longitude', 'createdById', 'googlePlaceId', 'id'])(
    'rejects the immutable field %s',
    (field) => {
      const result = parseLocationUpdate({ type: 'PARK', [field]: 'x' })
      expect(result).toEqual({ error: `Fields cannot be updated: ${field}` })
    }
  )

  it('validates the type', () => {
    expect(parseLocationUpdate({ type: 'SPACESHIP' })).toEqual({ error: 'Invalid location type' })
    expect(parseLocationUpdate({ type: null })).toEqual({ error: 'Invalid location type' })
    expect(parseLocationUpdate({ type: 'CAFE' })).toEqual({ data: { type: 'CAFE' } })
  })

  it('accepts booleans and null for the leash flags, nothing else', () => {
    expect(parseLocationUpdate({ leashRequired: true, offLeashArea: null })).toEqual({
      data: { leashRequired: true, offLeashArea: null },
    })
    expect(parseLocationUpdate({ leashRequired: 'yes' })).toEqual({
      error: 'leashRequired must be a boolean or null',
    })
    expect(parseLocationUpdate({ offLeashArea: 1 })).toEqual({
      error: 'offLeashArea must be a boolean or null',
    })
  })

  it('trims breed restrictions and turns empty values into null', () => {
    expect(parseLocationUpdate({ breedRestrictions: '  No pitbulls ' })).toEqual({
      data: { breedRestrictions: 'No pitbulls' },
    })
    expect(parseLocationUpdate({ breedRestrictions: '   ' })).toEqual({
      data: { breedRestrictions: null },
    })
    expect(parseLocationUpdate({ breedRestrictions: null })).toEqual({
      data: { breedRestrictions: null },
    })
  })

  it('rejects non-string or too long breed restrictions', () => {
    expect(parseLocationUpdate({ breedRestrictions: 3 })).toEqual({
      error: 'breedRestrictions must be a string or null',
    })
    expect(parseLocationUpdate({ breedRestrictions: 'a'.repeat(501) })).toEqual({
      error: 'breedRestrictions must be at most 500 characters',
    })
    expect(parseLocationUpdate({ breedRestrictions: 'a'.repeat(500) })).toHaveProperty('data')
  })

  it('stores amenities as a deduplicated JSON string', () => {
    expect(parseLocationUpdate({ amenities: ['Patio', 'Patio', 'Water bowls'] })).toEqual({
      data: { amenities: JSON.stringify(['Patio', 'Water bowls']) },
    })
    expect(parseLocationUpdate({ amenities: [] })).toEqual({ data: { amenities: '[]' } })
    expect(parseLocationUpdate({ amenities: null })).toEqual({ data: { amenities: null } })
  })

  it('rejects invalid amenities', () => {
    const invalid = { error: 'amenities must be an array of known amenities or null' }
    expect(parseLocationUpdate({ amenities: 'Patio' })).toEqual(invalid)
    expect(parseLocationUpdate({ amenities: [1] })).toEqual(invalid)
    expect(parseLocationUpdate({ amenities: ['Hot tub'] })).toEqual(invalid)
    expect(parseLocationUpdate({ amenities: ['Patio', ' Patio '] })).toEqual(invalid)
  })

  it('supports partial updates and returns only the provided fields', () => {
    expect(parseLocationUpdate({ type: 'PARK', leashRequired: false })).toEqual({
      data: { type: 'PARK', leashRequired: false },
    })
  })
})
