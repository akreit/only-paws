import { describe, expect, it } from 'vitest'
import { PEOPLE_CARD_SELECT, PUBLIC_USER_SELECT } from '../../../../src/server/utils/public-user'

describe('public user selects', () => {
  it('embeds only id, username and avatars for authors, uploaders and commenters', () => {
    expect(Object.keys(PUBLIC_USER_SELECT).sort()).toEqual([
      'avatarUrl',
      'id',
      'profilePhotoUrl',
      'username',
    ])
  })

  it('adds profile details only for Meet people cards, never private fields', () => {
    expect(Object.keys(PEOPLE_CARD_SELECT).sort()).toEqual([
      'avatarUrl',
      'bio',
      'dogBreed',
      'dogName',
      'hasDog',
      'homeCity',
      'id',
      'lookingFor',
      'profilePhotoUrl',
      'username',
    ])
  })
})
