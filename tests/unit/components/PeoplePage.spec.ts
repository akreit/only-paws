import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import PeoplePage from '~/pages/people.vue'

const searchPeople = vi.fn()
const isSignedIn = ref(true)
const isLoaded = ref(true)
const loading = ref(false)
const error = ref<string | null>(null)
const needsLocation = ref(false)

const person = {
  id: 'p1',
  username: 'anna',
  avatarUrl: null,
  bio: 'Loves long walks',
  homeCity: 'Berlin',
  hasDog: true,
  dogName: 'Rex',
  dogBreed: 'Beagle',
  lookingFor: ['FRIENDS'],
  distanceLabel: '~3 km',
}

function response(overrides = {}) {
  return { people: [person], page: 1, pageSize: 20, total: 1, hasMore: false, ...overrides }
}

function mountPage() {
  return mount(PeoplePage, {
    global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
  })
}

describe('people page', () => {
  beforeEach(() => {
    searchPeople.mockReset().mockResolvedValue(response())
    isSignedIn.value = true
    isLoaded.value = true
    loading.value = false
    error.value = null
    needsLocation.value = false
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('reactive', reactive)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useAuth', () => ({ isSignedIn, isLoaded }))
    vi.stubGlobal('usePeople', () => ({ loading, error, needsLocation, searchPeople }))
  })

  it('shows a pitch and sign-in button to signed-out users without searching', () => {
    isSignedIn.value = false
    const wrapper = mountPage()

    expect(wrapper.text()).toContain('Sign In')
    expect(wrapper.text()).toContain('chose to be found')
    expect(searchPeople).not.toHaveBeenCalled()
  })

  it('renders result cards with the bucketed distance', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(searchPeople).toHaveBeenCalledWith(expect.objectContaining({ radius: 10, page: 1 }))
    const card = wrapper.find('[data-testid="person-card"]')
    expect(card.text()).toContain('anna')
    expect(card.text()).toContain('Rex')
    expect(card.text()).toContain('Beagle')
    expect(card.text()).toContain('Berlin')
    expect(card.text()).toContain('Loves long walks')
    expect(card.text()).toContain('~3 km')
    expect(wrapper.text()).not.toContain('Load more')
  })

  it('shows the empty state when nobody matches', async () => {
    searchPeople.mockResolvedValue(response({ people: [], total: 0 }))
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true)
  })

  it('shows the loading state while the first search runs', async () => {
    loading.value = true
    const wrapper = mountPage()

    expect(wrapper.text()).toContain('Looking for people nearby')
  })

  it('shows the error state and retries', async () => {
    searchPeople.mockResolvedValue(null)
    error.value = 'Could not load people. Please try again.'
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-testid="error"]').text()).toContain('Could not load people')

    searchPeople.mockResolvedValue(response())
    error.value = null
    await wrapper.find('[data-testid="error"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="person-card"]').exists()).toBe(true)
  })

  it('prompts to set a location when the API says none is stored', async () => {
    searchPeople.mockResolvedValue(null)
    needsLocation.value = true
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-testid="no-location"]').text()).toContain('approximate location')
  })

  it('applies filters and appends the next page on "Load more"', async () => {
    searchPeople.mockResolvedValueOnce(response({ hasMore: true, total: 2 }))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('#people-breed').setValue('Beagle')
    await wrapper.find('button[aria-pressed]').trigger('click')

    searchPeople.mockResolvedValueOnce(
      response({ people: [{ ...person, id: 'p2', username: 'ben' }], page: 2, total: 2 })
    )
    const loadMore = wrapper.findAll('button').find((b) => b.text() === 'Load more')!
    await loadMore.trigger('click')
    await flushPromises()

    expect(searchPeople).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, breed: 'Beagle', hasDog: true, lookingFor: ['FRIENDS'] })
    )
    expect(wrapper.findAll('[data-testid="person-card"]')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Load more')

    // Toggling a tag again removes it
    await wrapper.find('button[aria-pressed]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(searchPeople).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, lookingFor: [] })
    )
  })
})
