import { describe, it, expect } from 'vitest'
import { PROFILE_LIMITS, countCharacters, validateProfileUpdate } from '~/utils/profile'

describe('countCharacters', () => {
  it('counts emojis as one character', () => {
    expect(countCharacters('🐶🐶🐶')).toBe(3)
    expect(countCharacters('abc')).toBe(3)
  })
})

describe('validateProfileUpdate', () => {
  it('accepts a valid full update and trims text', () => {
    const result = validateProfileUpdate({
      bio: '  Hello there  ',
      homeCity: ' Berlin ',
      hasDog: true,
      dogName: 'Rex',
      dogBreed: 'Beagle',
      lookingFor: ['FRIENDS', 'TIPS'],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.data).toEqual({
      bio: 'Hello there',
      homeCity: 'Berlin',
      hasDog: true,
      dogName: 'Rex',
      dogBreed: 'Beagle',
      lookingFor: ['FRIENDS', 'TIPS'],
    })
  })

  it('allows a 500 emoji bio', () => {
    const bio = '🐶'.repeat(PROFILE_LIMITS.bio)
    expect(validateProfileUpdate({ bio }).valid).toBe(true)
  })

  it('rejects an overlong bio', () => {
    const result = validateProfileUpdate({ bio: 'a'.repeat(PROFILE_LIMITS.bio + 1) })
    expect(result.valid).toBe(false)
    expect(result.errors[0].field).toBe('bio')
  })

  it('rejects overlong city, dog name and breed', () => {
    const result = validateProfileUpdate({
      homeCity: 'a'.repeat(101),
      dogName: 'a'.repeat(51),
      dogBreed: 'a'.repeat(101),
    })
    expect(result.errors.map((e) => e.field)).toEqual(['homeCity', 'dogName', 'dogBreed'])
  })

  it('converts empty strings to null and keeps explicit null', () => {
    const result = validateProfileUpdate({ bio: '   ', homeCity: null })
    expect(result.data).toEqual({ bio: null, homeCity: null })
  })

  it('rejects wrong types', () => {
    const result = validateProfileUpdate({
      bio: 5,
      homeCity: {},
      hasDog: 'yes',
      lookingFor: 'FRIENDS',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.map((e) => e.field)).toEqual(['bio', 'homeCity', 'hasDog', 'lookingFor'])
  })

  it('rejects non-object bodies', () => {
    for (const body of [null, undefined, 'x', [], 3]) {
      const result = validateProfileUpdate(body)
      expect(result.valid).toBe(false)
      expect(result.errors[0].field).toBe('body')
    }
  })

  it('rejects unknown lookingFor values', () => {
    const result = validateProfileUpdate({ lookingFor: ['FRIENDS', 'MONEY'] })
    expect(result.valid).toBe(false)
    expect(result.errors[0].field).toBe('lookingFor')
  })

  it('deduplicates lookingFor', () => {
    const result = validateProfileUpdate({ lookingFor: ['TIPS', 'TIPS', 'PLACES'] })
    expect(result.data.lookingFor).toEqual(['TIPS', 'PLACES'])
  })

  it('clears dog fields when hasDog is false', () => {
    const result = validateProfileUpdate({ hasDog: false, dogName: 'Rex', dogBreed: 'Beagle' })
    expect(result.valid).toBe(true)
    expect(result.data).toEqual({ hasDog: false, dogName: null, dogBreed: null })
  })

  it('ignores unknown keys', () => {
    const result = validateProfileUpdate({
      id: 'x',
      clerkUserId: 'evil',
      email: 'a@b.c',
      avatarUrl: 'http://x',
      bio: 'hi',
    })
    expect(result.data).toEqual({ bio: 'hi' })
  })
})
