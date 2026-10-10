import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import type { User } from '~/types'
import { createMockLocation } from '../../fixtures/factories'

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useUserStore()
    expect(store.user).toBeNull()
    expect(store.favorites).toEqual([])
    expect(store.favoriteLocationCache).toEqual([])
    expect(store.favoritesLoaded).toBe(false)
  })

  it('setUser sets and clears the user', () => {
    const store = useUserStore()
    store.setUser({ id: 'u1' } as User)
    expect(store.user).toMatchObject({ id: 'u1' })
    store.setUser(null)
    expect(store.user).toBeNull()
  })

  it('updateUser merges into the current user', () => {
    const store = useUserStore()
    store.setUser({ id: 'u1', bio: 'a' } as User)
    store.updateUser({ bio: 'b', homeCity: 'Oslo' })
    expect(store.user).toMatchObject({ id: 'u1', bio: 'b', homeCity: 'Oslo' })
  })

  it('updateUser is a no-op without a user', () => {
    const store = useUserStore()
    store.updateUser({ bio: 'x' })
    expect(store.user).toBeNull()
  })

  it('setFavorites stores ids and marks them loaded', () => {
    const store = useUserStore()
    store.setFavorites(['a'])
    expect(store.favorites).toEqual(['a'])
    expect(store.favoritesLoaded).toBe(true)
  })

  it('setFavorites with an empty list still counts as loaded', () => {
    const store = useUserStore()
    store.setFavorites([])
    expect(store.favoritesLoaded).toBe(true)
  })

  it('add/remove/isFavorite manage ids without duplicates', () => {
    const store = useUserStore()
    store.addFavorite('a')
    store.addFavorite('a')
    store.addFavorite('b')
    expect(store.favorites).toEqual(['a', 'b'])
    expect(store.isFavorite('a')).toBe(true)

    store.removeFavorite('a')
    store.removeFavorite('missing')
    expect(store.favorites).toEqual(['b'])
    expect(store.isFavorite('a')).toBe(false)
  })

  it('add/remove favorite do not mark favorites as loaded', () => {
    const store = useUserStore()
    store.addFavorite('a')
    expect(store.favoritesLoaded).toBe(false)
  })

  it('setFavoriteLocationCache stores locations', () => {
    const store = useUserStore()
    const loc = createMockLocation({ id: 'a' })
    store.setFavoriteLocationCache([loc])
    expect(store.favoriteLocationCache).toEqual([loc])
  })

  it('reset clears user, favorites, cache and loaded flag', () => {
    const store = useUserStore()
    store.setUser({ id: 'u1' } as User)
    store.setFavorites(['a'])
    store.setFavoriteLocationCache([createMockLocation({ id: 'a' })])

    store.reset()

    expect(store.user).toBeNull()
    expect(store.favorites).toEqual([])
    expect(store.favoriteLocationCache).toEqual([])
    expect(store.favoritesLoaded).toBe(false)
  })
})
