import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ProfilePage from '~/pages/profile.vue'

const updatePeopleSettings = vi.fn()
const geocodeAddress = vi.fn()
const profile = ref<Record<string, unknown> | null>(null)

// The page imports this composable explicitly, so a global stub would not reach it
vi.mock('~/composables/useProfile', () => ({
  useProfile: () => ({
    profile,
    saving: ref(false),
    fetchProfile: vi.fn().mockResolvedValue({ locations: [], reviews: [] }),
    saveProfile: vi.fn(),
  }),
}))

function mountPage() {
  return mount(ProfilePage, {
    global: {
      stubs: { NuxtLink: true, LocationCard: true, Rating: true, LoadingSpinner: true },
    },
  })
}

describe('profile "Meet people" section', () => {
  beforeEach(() => {
    updatePeopleSettings.mockReset().mockResolvedValue({})
    geocodeAddress.mockReset()
    profile.value = { discoverable: false, hasApproxLocation: false, homeCity: 'Berlin' }
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('reactive', reactive)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useAuth', () => ({ isSignedIn: ref(true), isLoaded: ref(true) }))
    vi.stubGlobal('useUser', () => ({ user: ref({ username: 'me' }) }))
    vi.stubGlobal('useFavorites', () => ({
      ensureFavorites: vi.fn().mockResolvedValue(undefined),
      favoriteLocations: ref([]),
    }))
    vi.stubGlobal('useMap', () => ({ geocodeAddress }))
    vi.stubGlobal('usePeople', () => ({ saving: ref(false), updatePeopleSettings }))
  })

  it('shows the explanation and that no location is set', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const section = wrapper.find('[data-testid="meet-people-section"]')
    expect(section.text()).toContain('exact location is never shown')
    expect(section.text()).toContain('about 1 km')
    expect(wrapper.find('[data-testid="approx-status"]').text()).toContain(
      'No approximate location'
    )
  })

  it('shows when the approximate location was last updated', async () => {
    profile.value = {
      discoverable: true,
      hasApproxLocation: true,
      approxLocationUpdatedAt: new Date().toISOString(),
    }
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-testid="approx-status"]').text()).toContain(
      'Approximate location set'
    )
    expect(wrapper.find('[data-testid="approx-status"]').text()).toContain('updated')
    expect(
      (wrapper.find('[data-testid="discoverable-toggle"]').element as HTMLInputElement).checked
    ).toBe(true)
  })

  it('saves the discoverable toggle', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="discoverable-toggle"]').setValue(true)

    expect(updatePeopleSettings).toHaveBeenCalledWith({ discoverable: true })
  })

  it('reverts the toggle and explains when saving fails', async () => {
    updatePeopleSettings.mockRejectedValue(new Error('400'))
    const wrapper = mountPage()
    await flushPromises()

    const toggle = wrapper.find('[data-testid="discoverable-toggle"]')
    await toggle.setValue(true)
    await flushPromises()

    expect((toggle.element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.text()).toContain('Set your approximate location first')
  })

  it('sends the browser location', async () => {
    const getCurrentPosition = vi.fn((ok) => ok({ coords: { latitude: 52.52, longitude: 13.4 } }))
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('current location'))!
      .trigger('click')
    await flushPromises()

    expect(updatePeopleSettings).toHaveBeenCalledWith({ latitude: 52.52, longitude: 13.4 })
  })

  it('reports a denied browser location', async () => {
    const getCurrentPosition = vi.fn((_ok, fail) => fail({ code: 1 }))
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('current location'))!
      .trigger('click')
    await flushPromises()

    expect(updatePeopleSettings).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Could not get your location')
  })

  it('reports a browser without geolocation', async () => {
    vi.stubGlobal('navigator', {})
    const wrapper = mountPage()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('current location'))!
      .trigger('click')

    expect(wrapper.text()).toContain('does not support location')
  })

  it('geocodes the home city', async () => {
    geocodeAddress.mockResolvedValue({ lat: 52.5, lng: 13.4 })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('home city'))!
      .trigger('click')
    await flushPromises()

    expect(geocodeAddress).toHaveBeenCalledWith('Berlin')
    expect(updatePeopleSettings).toHaveBeenCalledWith({ latitude: 52.5, longitude: 13.4 })
  })

  it('handles a home city that cannot be found or geocoded', async () => {
    geocodeAddress.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('maps'))
    const wrapper = mountPage()
    await flushPromises()
    const button = wrapper.findAll('button').find((b) => b.text().includes('home city'))!

    await button.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Could not find "Berlin"')

    await button.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Could not look up your home city')
    expect(updatePeopleSettings).not.toHaveBeenCalled()
  })

  it('disables the home city button without a home city', async () => {
    profile.value = { discoverable: false, hasApproxLocation: false, homeCity: null }
    const wrapper = mountPage()
    await flushPromises()

    const button = wrapper.findAll('button').find((b) => b.text().includes('home city'))!
    expect(button.attributes('disabled')).toBeDefined()
  })
})
