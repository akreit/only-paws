import { describe, it, expect } from 'vitest'
import { instagramProfileUrl, parseInstagramHandle } from '#shared/utils/instagram'

describe('parseInstagramHandle', () => {
  it.each([
    ['@Rex.The_Dog', 'rex.the_dog'],
    ['  rex  ', 'rex'],
    ['a'.repeat(30), 'a'.repeat(30)],
    ['dog_1.2', 'dog_1.2'],
  ])('normalises %j', (input, expected) => {
    expect(parseInstagramHandle(input)).toEqual({ ok: true, value: expected })
  })

  it.each([[''], ['   '], ['@'], [null], [undefined]])('treats %j as clear', (input) => {
    expect(parseInstagramHandle(input)).toEqual({ ok: true, value: null })
  })

  it.each([
    ['a'.repeat(31)],
    ['.rex'],
    ['rex.'],
    ['re..x'],
    ['re x'],
    ['re-x'],
    ['@@rex'],
    ['rex!'],
    ['rëx'],
    [42],
    [{}],
  ])('rejects %j', (input) => {
    expect(parseInstagramHandle(input)).toEqual({ ok: false })
  })
})

describe('instagramProfileUrl', () => {
  it('links to the profile', () => {
    expect(instagramProfileUrl('rex.dog')).toBe('https://instagram.com/rex.dog')
  })
})
