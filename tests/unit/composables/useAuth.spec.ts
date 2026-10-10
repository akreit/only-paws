import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, computed, watch, effectScope, type EffectScope } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
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
    vi.stubGlobal('useAuthStore', useAuthStore)
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

  it('syncs without sending clerkUserId, then loads favorites', async () => {
    mockApi([{ locationId: 'l1', location: { id: 'l1' } }])
    isSignedIn.value = true
    clerkUser.value = clerk

    run()
    await flush()

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/users/sync', {
      method: 'POST',
      body: { email: 'a@b.c', username: 'me', avatarUrl: 'http://img' },
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/favorites')
    expect(useUserStore().favorites).toEqual(['l1'])
    expect(useUserStore().profile).toMatchObject({ id: 'u1' })
  })

  it('does not toast when the background favorites load fails', async () => {
    mockApi(new Error('boom'))
    isSignedIn.value = true
    clerkUser.value = clerk

    run()
    await flush()

    expect(useNotificationsStore().notifications).toHaveLength(0)
    expect(useUserStore().profile).toMatchObject({ id: 'u1' })
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

  it('does not sync or load favorites during SSR', async () => {
    mockApi()
    isSignedIn.value = true
    clerkUser.value = clerk
    vi.stubGlobal('__TEST_SSR__', true)

    try {
      run()
      await flush()
    } finally {
      vi.unstubAllGlobals()
    }

    expect(fetchMock).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications).toHaveLength(0)
  })

  it('clears favorites and profile on sign-out', async () => {
    mockApi([{ locationId: 'l1', location: { id: 'l1' } }])
    isSignedIn.value = true
    clerkUser.value = clerk
    run()
    await flush()
    expect(useUserStore().favorites).toEqual(['l1'])

    isSignedIn.value = false
    clerkUser.value = null
    await flush()

    expect(useUserStore().favorites).toEqual([])
    expect(useUserStore().favoriteLocationData).toEqual([])
    expect(useUserStore().profile).toBeNull()
  })
})
