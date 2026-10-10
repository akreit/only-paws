import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import { useNotificationsStore } from '~/stores/notifications'
import { useProfile } from '~/composables/useProfile'

const fetchMock = vi.fn()

describe('useProfile', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useUserStore', useUserStore)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
  })

  it('fetchProfile stores the profile', async () => {
    const user = { id: 'u1', hasDog: true }
    fetchMock.mockResolvedValue({ user, locations: [], reviews: [] })
    const { fetchProfile, profile, loading } = useProfile()

    const data = await fetchProfile()

    expect(data.user).toEqual(user)
    expect(profile.value).toEqual(user)
    expect(loading.value).toBe(false)
  })

  it('fetchProfile notifies and rethrows on failure', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))
    const { fetchProfile } = useProfile()

    await expect(fetchProfile()).rejects.toThrow('boom')
    expect(useNotificationsStore().notifications[0].type).toBe('error')
  })

  it('saveProfile PATCHes, updates the store and notifies', async () => {
    const user = { id: 'u1', bio: 'hi' }
    fetchMock.mockResolvedValue(user)
    const { saveProfile, profile, saving } = useProfile()

    await saveProfile({ bio: 'hi' })

    expect(fetchMock).toHaveBeenCalledWith('/api/users/profile', {
      method: 'PATCH',
      body: { bio: 'hi' },
    })
    expect(profile.value).toEqual(user)
    expect(saving.value).toBe(false)
    expect(useNotificationsStore().notifications[0].type).toBe('success')
  })

  it('saveProfile notifies and rethrows on failure', async () => {
    fetchMock.mockRejectedValue(new Error('nope'))
    const { saveProfile, profile } = useProfile()

    await expect(saveProfile({ bio: 'x' })).rejects.toThrow('nope')
    expect(profile.value).toBeNull()
    expect(useNotificationsStore().notifications[0].type).toBe('error')
  })
})
