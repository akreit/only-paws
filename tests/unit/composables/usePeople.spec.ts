import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePeople } from '~/composables/usePeople'

const notifications = { success: vi.fn(), error: vi.fn() }
const userStore = { user: { id: 'u1' } as Record<string, unknown> | null, setUser: vi.fn() }
const fetchMock = vi.fn()

describe('usePeople', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    notifications.success.mockReset()
    notifications.error.mockReset()
    userStore.setUser.mockReset()
    userStore.user = { id: 'u1' }
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('useUserStore', () => userStore)
    vi.stubGlobal('useNotificationsStore', () => notifications)
  })

  it('builds the query from the filters', async () => {
    fetchMock.mockResolvedValue({ people: [] })
    const { searchPeople, loading } = usePeople()

    await searchPeople({
      radius: 5,
      breed: ' Beagle ',
      lookingFor: ['FRIENDS', 'TIPS'],
      hasDog: true,
      page: 2,
      pageSize: 10,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/people', {
      query: {
        radius: 5,
        breed: 'Beagle',
        lookingFor: 'FRIENDS,TIPS',
        hasDog: 'true',
        page: 2,
        pageSize: 10,
      },
    })
    expect(loading.value).toBe(false)
  })

  it('sends an empty query for empty filters', async () => {
    fetchMock.mockResolvedValue({ people: [] })
    await usePeople().searchPeople()
    expect(fetchMock).toHaveBeenCalledWith('/api/people', { query: {} })
  })

  it('flags a missing location instead of an error', async () => {
    fetchMock.mockRejectedValue({
      statusCode: 400,
      data: { message: 'Set your approximate location in your profile' },
    })
    const people = usePeople()

    expect(await people.searchPeople()).toBeNull()
    expect(people.needsLocation.value).toBe(true)
    expect(people.error.value).toBeNull()
  })

  it('reports other failures as an error', async () => {
    fetchMock.mockRejectedValue(undefined)
    const people = usePeople()

    expect(await people.searchPeople()).toBeNull()
    expect(people.needsLocation.value).toBe(false)
    expect(people.error.value).toContain('Could not load people')
  })

  it('stores updated settings on the user and notifies', async () => {
    const settings = { discoverable: true, hasApproxLocation: true, approxLocationUpdatedAt: null }
    fetchMock.mockResolvedValue(settings)

    await usePeople().updatePeopleSettings({ discoverable: true })

    expect(fetchMock).toHaveBeenCalledWith('/api/users/people-settings', {
      method: 'PATCH',
      body: { discoverable: true },
    })
    expect(userStore.setUser).toHaveBeenCalledWith({ id: 'u1', ...settings })
    expect(notifications.success).toHaveBeenCalled()
  })

  it('does not touch the store without a user, and surfaces the API message on failure', async () => {
    userStore.user = null
    fetchMock.mockResolvedValueOnce({ discoverable: false })
    await usePeople().updatePeopleSettings({ discoverable: false })
    expect(userStore.setUser).not.toHaveBeenCalled()

    fetchMock.mockRejectedValueOnce({ data: { message: 'Nope' } })
    const people = usePeople()
    await expect(people.updatePeopleSettings({ discoverable: true })).rejects.toBeDefined()
    expect(notifications.error).toHaveBeenCalledWith('Nope')
    expect(people.saving.value).toBe(false)

    fetchMock.mockRejectedValueOnce({})
    await expect(people.updatePeopleSettings({})).rejects.toBeDefined()
    expect(notifications.error).toHaveBeenLastCalledWith('Failed to save Meet people settings')
  })

  it('flags a 403 so the page can point to the opt-in', async () => {
    fetchMock.mockRejectedValue({ statusCode: 403, data: { message: 'Turn on Meet people' } })
    const people = usePeople()

    expect(await people.searchPeople()).toBeNull()
    expect(people.needsOptIn.value).toBe(true)
    expect(people.error.value).toBeNull()

    fetchMock.mockResolvedValue({ people: [] })
    await people.searchPeople()
    expect(people.needsOptIn.value).toBe(false)
  })

  it('formats the search retry time in local time on 429', async () => {
    const retryAt = '2026-10-12T15:30:00.000Z'
    fetchMock.mockRejectedValue({ statusCode: 429, data: { message: 'x', data: { retryAt } } })
    const people = usePeople()

    await people.searchPeople()

    expect(people.error.value).toContain(new Date(retryAt).toLocaleString())
  })

  it('falls back to "later" when 429 has no valid retry time', async () => {
    const people = usePeople()
    fetchMock.mockRejectedValueOnce({ statusCode: 429 })
    await people.searchPeople()
    expect(people.error.value).toContain('later')

    fetchMock.mockRejectedValueOnce({ statusCode: 429, data: { data: { retryAt: 'nope' } } })
    await people.searchPeople()
    expect(people.error.value).toContain('later')
  })

  it('exposes the cooldown message when a location change is rate limited', async () => {
    const retryAt = '2026-10-12T15:30:00.000Z'
    fetchMock.mockRejectedValue({
      statusCode: 429,
      data: { message: 'raw', data: { retryAt } },
    })
    const people = usePeople()

    await expect(people.updatePeopleSettings({ latitude: 1, longitude: 2 })).rejects.toBeDefined()

    const expected = `You can change your location again after ${new Date(retryAt).toLocaleString()}.`
    expect(people.cooldownMessage.value).toBe(expected)
    expect(notifications.error).toHaveBeenCalledWith(expected)

    fetchMock.mockResolvedValue({})
    await people.updatePeopleSettings({})
    expect(people.cooldownMessage.value).toBe('')
  })
})
