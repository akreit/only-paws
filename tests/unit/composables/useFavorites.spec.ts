import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import { useNotificationsStore } from '~/stores/notifications'
import { useFavorites } from '~/composables/useFavorites'
import { createMockLocation } from '../../fixtures/factories'

const fetchMock = vi.fn()

function lastNotificationType() {
  return useNotificationsStore().notifications.at(-1)?.type
}

describe('useFavorites', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useUserStore', useUserStore)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('fetchFavorites stores ids and exposes the locations', async () => {
    const a = createMockLocation({ id: 'a' })
    const b = createMockLocation({ id: 'b' })
    fetchMock.mockResolvedValue([
      { locationId: 'a', location: a },
      { locationId: 'b', location: b },
    ])
    const { fetchFavorites, favorites, favoriteLocations, loading } = useFavorites()

    expect(await fetchFavorites()).toEqual(['a', 'b'])
    expect(fetchMock).toHaveBeenCalledWith('/api/favorites')
    expect(favorites.value).toEqual(['a', 'b'])
    expect(favoriteLocations.value).toEqual([a, b])
    expect(loading.value).toBe(false)
  })

  it('fetchFavorites clears the list when the server returns none', async () => {
    useUserStore().setFavorites([createMockLocation({ id: 'old' })])
    fetchMock.mockResolvedValue([])
    const { fetchFavorites, favorites, favoriteLocations } = useFavorites()

    await fetchFavorites()

    expect(favorites.value).toEqual([])
    expect(favoriteLocations.value).toEqual([])
  })

  it('fetchFavorites toasts and rethrows on failure', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))
    const { fetchFavorites, loading } = useFavorites()

    await expect(fetchFavorites()).rejects.toThrow('boom')
    expect(lastNotificationType()).toBe('error')
    expect(loading.value).toBe(false)
  })

  it('background fetchFavorites logs instead of toasting', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))
    const { fetchFavorites } = useFavorites()

    await expect(fetchFavorites({ silent: true })).rejects.toThrow('boom')
    expect(useNotificationsStore().notifications).toHaveLength(0)
    expect(console.error).toHaveBeenCalled()
  })

  it('ensureFavorites fetches when favorites are not loaded yet', async () => {
    const a = createMockLocation({ id: 'a' })
    fetchMock.mockResolvedValue([{ locationId: 'a', location: a }])
    const { ensureFavorites, favorites } = useFavorites()

    await ensureFavorites({ silent: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(favorites.value).toEqual(['a'])
    expect(useUserStore().favoritesLoaded).toBe(true)
  })

  it('ensureFavorites skips the request when already loaded', async () => {
    useUserStore().setFavorites([createMockLocation({ id: 'a' })])
    const { ensureFavorites } = useFavorites()

    expect(await ensureFavorites()).toEqual(['a'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ensureFavorites fetches again after a reset', async () => {
    useUserStore().setFavorites([createMockLocation({ id: 'a' })])
    useUserStore().reset()
    fetchMock.mockResolvedValue([])
    const { ensureFavorites } = useFavorites()

    await ensureFavorites()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('addFavorite POSTs, updates the store and toasts success', async () => {
    fetchMock.mockResolvedValue({})
    const { addFavorite, isFavorite } = useFavorites()

    await addFavorite('a')

    expect(fetchMock).toHaveBeenCalledWith('/api/favorites', {
      method: 'POST',
      body: { locationId: 'a' },
    })
    expect(isFavorite('a')).toBe(true)
    expect(lastNotificationType()).toBe('success')
  })

  it('addFavorite toasts and leaves the store untouched on failure', async () => {
    fetchMock.mockRejectedValue(new Error('nope'))
    const { addFavorite, isFavorite } = useFavorites()

    await expect(addFavorite('a')).rejects.toThrow('nope')
    expect(isFavorite('a')).toBe(false)
    expect(lastNotificationType()).toBe('error')
  })

  it('removeFavorite DELETEs and removes the card from favoriteLocations', async () => {
    const a = createMockLocation({ id: 'a' })
    const b = createMockLocation({ id: 'b' })
    fetchMock.mockResolvedValueOnce([
      { locationId: 'a', location: a },
      { locationId: 'b', location: b },
    ])
    const { fetchFavorites, removeFavorite, favoriteLocations } = useFavorites()
    await fetchFavorites()
    fetchMock.mockResolvedValueOnce({ success: true })

    await removeFavorite('a')

    expect(fetchMock).toHaveBeenLastCalledWith('/api/favorites/a', { method: 'DELETE' })
    expect(favoriteLocations.value).toEqual([b])
    expect(lastNotificationType()).toBe('success')
  })

  it('removeFavorite toasts and keeps the favorite on failure', async () => {
    useUserStore().setFavorites([createMockLocation({ id: 'a' })])
    fetchMock.mockRejectedValue(new Error('nope'))
    const { removeFavorite, isFavorite } = useFavorites()

    await expect(removeFavorite('a')).rejects.toThrow('nope')
    expect(isFavorite('a')).toBe(true)
    expect(lastNotificationType()).toBe('error')
  })

  it('toggleFavorite adds then removes', async () => {
    fetchMock.mockResolvedValue({})
    const { toggleFavorite, isFavorite } = useFavorites()

    await toggleFavorite('a')
    expect(isFavorite('a')).toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/favorites', expect.anything())

    await toggleFavorite('a')
    expect(isFavorite('a')).toBe(false)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/favorites/a', { method: 'DELETE' })
  })

  it('toggleFavorite removes a place already loaded as saved', async () => {
    useUserStore().setFavorites([createMockLocation({ id: 'a' })])
    fetchMock.mockResolvedValue({})
    const { toggleFavorite, isFavorite } = useFavorites()

    await toggleFavorite('a')

    expect(fetchMock).toHaveBeenCalledWith('/api/favorites/a', { method: 'DELETE' })
    expect(isFavorite('a')).toBe(false)
  })

  it('concurrent fetch/ensure calls share one request; a later fetch makes a new one', async () => {
    let resolve!: (v: unknown) => void
    fetchMock.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    const { fetchFavorites, ensureFavorites } = useFavorites()

    const p1 = fetchFavorites({ silent: true })
    const p2 = ensureFavorites({ silent: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    resolve([])
    await Promise.all([p1, p2])

    fetchMock.mockResolvedValue([])
    await fetchFavorites()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('a shared failing request rejects every caller, each reporting its own way', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))
    const { fetchFavorites, ensureFavorites } = useFavorites()

    const results = await Promise.allSettled([fetchFavorites({ silent: true }), ensureFavorites()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected'])
    expect(useNotificationsStore().notifications).toHaveLength(1)
  })

  it('reset during an in-flight request: ensureFavorites starts a new one, old result dropped', async () => {
    const a = createMockLocation({ id: 'a' })
    const b = createMockLocation({ id: 'b' })
    let resolveOld!: (v: unknown) => void
    fetchMock.mockImplementationOnce(() => new Promise((r) => (resolveOld = r)))
    const { fetchFavorites, ensureFavorites, favorites } = useFavorites()

    const oldP = fetchFavorites({ silent: true })
    useUserStore().reset()
    fetchMock.mockResolvedValueOnce([{ locationId: 'b', location: b }])
    await ensureFavorites()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    resolveOld([{ locationId: 'a', location: a }])
    await oldP
    expect(favorites.value).toEqual(['b'])
  })
})
