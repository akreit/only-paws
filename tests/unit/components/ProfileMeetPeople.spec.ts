import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ProfileMeetPeople from '~/components/profile/ProfileMeetPeople.vue'

const updatePeopleSettings = vi.fn()
const geocodeAddress = vi.fn()
const cooldownMessage = ref('')
const profile = ref<Record<string, unknown> | null>(null)

// The component imports this composable explicitly, so a global stub would not reach it
vi.mock('~/composables/useProfile', () => ({
  useProfile: () => ({
    profile,
  }),
}))

function mountPage() {
  return mount(ProfileMeetPeople)
}

describe('ProfileMeetPeople', () => {
  beforeEach(() => {
    updatePeopleSettings.mockReset().mockResolvedValue({})
    geocodeAddress.mockReset()
    cooldownMessage.value = ''
    profile.value = { discoverable: false, hasApproxLocation: false, homeCity: 'Berlin' }
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('reactive', reactive)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useMap', () => ({ geocodeAddress }))
    vi.stubGlobal('usePeople', () => ({
      saving: ref(false),
      cooldownMessage,
      updatePeopleSettings,
    }))
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
    expect(wrapper.text()).toContain('Choose a location below')
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

    expect(updatePeopleSettings).toHaveBeenCalledWith({
      discoverable: true,
      latitude: 52.52,
      longitude: 13.4,
    })
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
    expect(updatePeopleSettings).toHaveBeenCalledWith({
      discoverable: true,
      latitude: 52.5,
      longitude: 13.4,
    })
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

  it('does not send discoverable again when already opted in', async () => {
    profile.value = { discoverable: true, hasApproxLocation: true, homeCity: 'Berlin' }
    geocodeAddress.mockResolvedValue({ lat: 1, lng: 2 })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('home city'))!
      .trigger('click')
    await flushPromises()

    expect(updatePeopleSettings).toHaveBeenCalledWith({ latitude: 1, longitude: 2 })
  })

  it('shows the cooldown message when the location was changed recently', async () => {
    profile.value = { discoverable: true, hasApproxLocation: true, homeCity: 'Berlin' }
    geocodeAddress.mockResolvedValue({ lat: 1, lng: 2 })
    updatePeopleSettings.mockImplementation(async () => {
      cooldownMessage.value = 'You can change your location again after 1/1/2027, 10:00:00 AM.'
      throw new Error('429')
    })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('home city'))!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('You can change your location again after')
  })

  it('shows the cooldown message when the toggle is rejected', async () => {
    updatePeopleSettings.mockImplementation(async () => {
      cooldownMessage.value = 'You can change your location again after later.'
      throw new Error('429')
    })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="discoverable-toggle"]').setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('You can change your location again')
  })

  it('has the anchor the people page links to', async () => {
    const wrapper = mountPage()
    expect(wrapper.find('section#meet-people').exists()).toBe(true)
  })
})
