import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, computed, watch, effectScope, type EffectScope } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import { useNotificationsStore } from '~/stores/notifications'
import { useFavorites } from '~/composables/useFavorites'

const { isSignedIn, isLoaded, clerkUser } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { isSignedIn: ref(false), isLoaded: ref(true), clerkUser: ref<unknown>(null) }
})

vi.mock('@clerk/nuxt/composables', () => ({
  useAuth: () => ({ isSignedIn, isLoaded }),
  useUser: () => ({ user: clerkUser }),
}))

const { useAuthSync } = await import('~/composables/useAuth')

const fetchMock = vi.fn()
const clerk = {
  id: 'clerk_1',
  primaryEmailAddress: { emailAddress: 'a@b.c' },
  username: 'me',
  imageUrl: 'http://img',
}
const flush = () => new Promise((r) => setTimeout(r, 0))

let scope: EffectScope

// Run each composable in a scope so its watchers don't leak into later tests
function run() {
  scope = effectScope()
  scope.run(() => useAuthSync())
}

describe('useAuthSync', () => {
  afterEach(() => scope?.stop())

  beforeEach(() => {
    isSignedIn.value = false
    clerkUser.value = null
    setActivePinia(createPinia())
    fetchMock.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('useUserStore', useUserStore)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
    vi.stubGlobal('useFavorites', useFavorites)
  })

  function mockApi(favoritesResult: unknown = []) {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/users/sync') return { id: 'u1', clerkUserId: 'clerk_1' }
      if (url === '/api/favorites') {
        if (favoritesResult instanceof Error) throw favoritesResult
        return favoritesResult
      }
    })
  }

  it('syncs without sending a body, then loads favorites', async () => {
    mockApi([{ locationId: 'l1', location: { id: 'l1' } }])
    isSignedIn.value = true
    clerkUser.value = clerk

    run()
    await flush()

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/users/sync', {
      method: 'POST',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/favorites')
    expect(useUserStore().favorites).toEqual(['l1'])
    expect(useUserStore().user).toMatchObject({ id: 'u1' })
    expect(useUserStore().favoritesLoaded).toBe(true)
  })

  it('exposes only syncUser', async () => {
    mockApi()
    let sync: ReturnType<typeof useAuthSync> | undefined
    scope = effectScope()
    scope.run(() => {
      sync = useAuthSync()
    })
    expect(Object.keys(sync ?? {})).toEqual(['syncUser'])
  })

  it('does not toast when the background favorites load fails', async () => {
    mockApi(new Error('boom'))
    isSignedIn.value = true
    clerkUser.value = clerk

    run()
    await flush()

    expect(useNotificationsStore().notifications).toHaveLength(0)
    expect(useUserStore().user).toMatchObject({ id: 'u1' })
  })

  it('skips the favorites load and toasts when the sync fails', async () => {
    fetchMock.mockRejectedValue(new Error('sync failed'))
    isSignedIn.value = true
    clerkUser.value = clerk

    run()
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(useNotificationsStore().notifications[0].type).toBe('error')
  })

  it('resets user, favorites, cache and loaded flag on sign-out', async () => {
    mockApi([{ locationId: 'l1', location: { id: 'l1' } }])
    isSignedIn.value = true
    clerkUser.value = clerk
    run()
    await flush()
    expect(useUserStore().favorites).toEqual(['l1'])
    expect(useUserStore().user).toMatchObject({ id: 'u1' })
    expect(useUserStore().favoriteLocationCache).toHaveLength(1)

    isSignedIn.value = false
    clerkUser.value = null
    await flush()

    expect(useUserStore().favorites).toEqual([])
    expect(useUserStore().favoriteLocationCache).toEqual([])
    expect(useUserStore().user).toBeNull()
    expect(useUserStore().favoritesLoaded).toBe(false)
  })

  function deferred<T = unknown>() {
    let resolve!: (v: T) => void
    const promise = new Promise<T>((r) => (resolve = r))
    return { promise, resolve }
  }

  it('ignores a sync response that arrives after sign-out', async () => {
    const sync = deferred()
    fetchMock.mockImplementation((url: string) =>
      url === '/api/users/sync' ? sync.promise : Promise.resolve([])
    )
    isSignedIn.value = true
    clerkUser.value = clerk
    run()
    await flush()

    isSignedIn.value = false
    clerkUser.value = null
    await flush()
    sync.resolve({ id: 'u1', clerkUserId: 'clerk_1' })
    await flush()

    expect(useUserStore().user).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('ignores a favorites response that arrives after sign-out', async () => {
    const favs = deferred()
    fetchMock.mockImplementation((url: string) =>
      url === '/api/users/sync'
        ? Promise.resolve({ id: 'u1', clerkUserId: 'clerk_1' })
        : favs.promise
    )
    isSignedIn.value = true
    clerkUser.value = clerk
    run()
    await flush()
    expect(useUserStore().user).toMatchObject({ id: 'u1' })

    isSignedIn.value = false
    clerkUser.value = null
    await flush()
    favs.resolve([{ locationId: 'l1', location: { id: 'l1' } }])
    await flush()

    expect(useUserStore().user).toBeNull()
    expect(useUserStore().favorites).toEqual([])
    expect(useUserStore().favoritesLoaded).toBe(false)
  })

  describe('account switch', () => {
    const clerkB = { ...clerk, id: 'clerk_2' }

    it('clears A immediately, then loads B and reloads favorites', async () => {
      const syncB = deferred()
      let calls = 0
      fetchMock.mockImplementation(async (url: string) => {
        if (url === '/api/users/sync') {
          return ++calls === 1 ? { id: 'uA', clerkUserId: 'clerk_1' } : syncB.promise
        }
        return calls === 1
          ? [{ locationId: 'a', location: { id: 'a' } }]
          : [{ locationId: 'b', location: { id: 'b' } }]
      })
      isSignedIn.value = true
      clerkUser.value = clerk
      run()
      await flush()
      expect(useUserStore().favorites).toEqual(['a'])

      clerkUser.value = clerkB
      await flush()
      expect(useUserStore().user).toBeNull()
      expect(useUserStore().favorites).toEqual([])
      expect(useUserStore().favoritesLoaded).toBe(false)

      syncB.resolve({ id: 'uB', clerkUserId: 'clerk_2' })
      await flush()
      expect(useUserStore().user).toMatchObject({ id: 'uB' })
      expect(useUserStore().favorites).toEqual(['b'])

      const { ensureFavorites } = useFavorites()
      await ensureFavorites()
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it('leaves the store empty, not A, when B sync fails', async () => {
      let calls = 0
      fetchMock.mockImplementation(async (url: string) => {
        if (url === '/api/users/sync') {
          if (++calls === 1) return { id: 'uA', clerkUserId: 'clerk_1' }
          throw new Error('nope')
        }
        return [{ locationId: 'a', location: { id: 'a' } }]
      })
      isSignedIn.value = true
      clerkUser.value = clerk
      run()
      await flush()

      clerkUser.value = clerkB
      await flush()

      expect(useUserStore().user).toBeNull()
      expect(useUserStore().favorites).toEqual([])
    })

    it("clears A's favorites on switch even when A had no DB user (sync failed)", async () => {
      const syncB = deferred()
      let calls = 0
      fetchMock.mockImplementation(async (url: string) => {
        if (url === '/api/users/sync') {
          if (++calls === 1) throw new Error('A sync failed')
          return syncB.promise
        }
        return [{ locationId: 'a', location: { id: 'a' } }]
      })
      isSignedIn.value = true
      clerkUser.value = clerk
      run()
      await flush()
      expect(useUserStore().user).toBeNull()

      // Profile page loads A's favorites despite the failed sync
      await useFavorites().ensureFavorites()
      expect(useUserStore().favorites).toEqual(['a'])
      expect(useUserStore().favoritesLoaded).toBe(true)

      clerkUser.value = clerkB
      await flush()

      // B's sync is still pending
      expect(useUserStore().favorites).toEqual([])
      expect(useUserStore().favoriteLocationCache).toEqual([])
      expect(useUserStore().favoritesLoaded).toBe(false)

      syncB.resolve({ id: 'uB', clerkUserId: 'clerk_2' })
      await flush()
    })

    it('does not re-sync when the Clerk user object changes but the id does not', async () => {
      mockApi()
      isSignedIn.value = true
      clerkUser.value = clerk
      run()
      await flush()
      fetchMock.mockClear()

      clerkUser.value = { ...clerk, imageUrl: 'http://other' }
      await flush()

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
