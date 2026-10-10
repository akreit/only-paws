import { describe, it, expect, beforeEach, vi } from 'vitest'
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

  it('setFavorites stores locations, ids and marks them loaded', () => {
    const store = useUserStore()
    const loc = createMockLocation({ id: 'a' })
    store.setFavorites([loc])
    expect(store.favorites).toEqual(['a'])
    expect(store.favoriteLocationCache).toEqual([loc])
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

  it('reset clears user, favorites, cache and loaded flag', () => {
    const store = useUserStore()
    store.setUser({ id: 'u1' } as User)
    store.setFavorites([createMockLocation({ id: 'a' })])

    store.reset()

    expect(store.user).toBeNull()
    expect(store.favorites).toEqual([])
    expect(store.favoriteLocationCache).toEqual([])
    expect(store.favoritesLoaded).toBe(false)
  })

  describe('loadFavorites', () => {
    function deferred<T>() {
      let resolve!: (v: T) => void
      let reject!: (e: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }

    it('shares one in-flight request, then starts a new one once settled', async () => {
      const store = useUserStore()
      const d = deferred<ReturnType<typeof createMockLocation>[]>()
      const fetcher = vi.fn(() => d.promise)

      const p1 = store.loadFavorites(fetcher)
      store.loadFavorites(fetcher)
      expect(fetcher).toHaveBeenCalledTimes(1)

      d.resolve([createMockLocation({ id: 'a' })])
      expect(await p1).toEqual(['a'])
      expect(store.favorites).toEqual(['a'])

      await store.loadFavorites(async () => [])
      expect(store.favorites).toEqual([])
    })

    it('starts a new request after a failure', async () => {
      const store = useUserStore()
      await expect(store.loadFavorites(() => Promise.reject(new Error('x')))).rejects.toThrow('x')
      const fetcher = vi.fn(async () => [])
      await store.loadFavorites(fetcher)
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(store.favoritesLoaded).toBe(true)
    })

    it('drops a response that arrives after reset', async () => {
      const store = useUserStore()
      const d = deferred<ReturnType<typeof createMockLocation>[]>()
      const p = store.loadFavorites(() => d.promise)

      store.reset()
      d.resolve([createMockLocation({ id: 'a' })])
      await p

      expect(store.favorites).toEqual([])
      expect(store.favoriteLocationCache).toEqual([])
      expect(store.favoritesLoaded).toBe(false)
    })

    it('reset during a request lets the next load start a fresh one', async () => {
      const store = useUserStore()
      const old = deferred<ReturnType<typeof createMockLocation>[]>()
      const oldP = store.loadFavorites(() => old.promise)
      store.reset()

      const fetcher = vi.fn(async () => [createMockLocation({ id: 'b' })])
      await store.loadFavorites(fetcher)
      expect(fetcher).toHaveBeenCalledTimes(1)

      old.resolve([createMockLocation({ id: 'a' })])
      await oldP
      expect(store.favorites).toEqual(['b'])
    })
  })
})
