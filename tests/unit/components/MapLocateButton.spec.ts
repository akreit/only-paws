import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MapLocateButton from '~/components/map/MapLocateButton.vue'

describe('MapLocateButton', () => {
  it('emits locate on click', async () => {
    const wrapper = mount(MapLocateButton, { props: { locating: false } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('locate')).toHaveLength(1)
    expect(wrapper.attributes('aria-label')).toBe('Use my location')
    expect(wrapper.find('svg').classes()).not.toContain('animate-spin')
  })

  it('is disabled, busy and shows the spinner while locating', async () => {
    const wrapper = mount(MapLocateButton, { props: { locating: true } })

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('svg').classes()).toContain('animate-spin')

    await wrapper.trigger('click')
    expect(wrapper.emitted('locate')).toBeUndefined()
  })
})
