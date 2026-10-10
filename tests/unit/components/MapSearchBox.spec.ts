import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MapSearchBox from '~/components/map/MapSearchBox.vue'
import { buildSearchDropdown } from '~/utils/map-search'
import { createMockLocation } from '../../fixtures/factories'

const model = buildSearchDropdown(
  [createMockLocation({ id: 'a', name: 'Bark Park' })],
  [
    { placeId: 'g1', mainText: 'Barkley Cafe', secondaryText: 'Town' },
    { placeId: 'g2', mainText: 'Bark Bar', secondaryText: 'City' },
  ]
)

function factory(props: Record<string, unknown> = {}) {
  return mount(MapSearchBox, {
    attachTo: document.body,
    props: {
      modelValue: 'bark',
      model,
      loading: false,
      placesUnavailable: false,
      ...props,
    },
  })
}

describe('MapSearchBox', () => {
  it('exposes combobox semantics and closed state until focus', async () => {
    const wrapper = factory()
    const input = wrapper.find('input')

    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-expanded')).toBe('false')

    await input.trigger('focus')
    expect(input.attributes('aria-expanded')).toBe('true')
    expect(input.attributes('aria-controls')).toBe(
      wrapper.find('[role="listbox"]').attributes('id')
    )
    expect(wrapper.findAll('[role="option"]')).toHaveLength(3)
    wrapper.unmount()
  })

  it('renders group headings outside the option set', async () => {
    const wrapper = factory()
    await wrapper.find('input').trigger('focus')

    expect(wrapper.text()).toContain('Saved places')
    expect(wrapper.text()).toContain('Google Maps')
    wrapper.unmount()
  })

  it('moves with arrows, wraps, and sets aria-activedescendant', async () => {
    const wrapper = factory()
    const input = wrapper.find('input')
    await input.trigger('focus')

    await input.trigger('keydown', { key: 'ArrowDown' })
    const options = wrapper.findAll('[role="option"]')
    expect(input.attributes('aria-activedescendant')).toBe(options[0]!.attributes('id'))
    expect(options[0]!.attributes('aria-selected')).toBe('true')

    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(input.attributes('aria-activedescendant')).toBe(options[2]!.attributes('id'))
    wrapper.unmount()
  })

  it('selects with Enter and closes', async () => {
    const wrapper = factory()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })

    const emitted = wrapper.emitted('select')!
    expect(emitted).toHaveLength(1)
    expect(emitted[0]![0]).toMatchObject({ kind: 'google', key: 'google:g1' })
    expect(input.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('ignores Enter when nothing is highlighted', async () => {
    const wrapper = factory()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('select')).toBeUndefined()
    wrapper.unmount()
  })

  it('selects on click', async () => {
    const wrapper = factory()
    await wrapper.find('input').trigger('focus')
    await wrapper.findAll('[role="option"]')[0]!.trigger('click')

    expect(wrapper.emitted('select')![0]![0]).toMatchObject({ kind: 'saved', key: 'saved:a' })
    wrapper.unmount()
  })

  it('closes on Escape and on outside pointer, and reopens on typing', async () => {
    const wrapper = factory()
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'Escape' })
    expect(input.attributes('aria-expanded')).toBe('false')

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-expanded')).toBe('true')

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(input.attributes('aria-expanded')).toBe('false')

    await input.setValue('barks')
    expect(input.attributes('aria-expanded')).toBe('true')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['barks'])
    wrapper.unmount()
  })

  it('stays closed below the minimum query length', async () => {
    const wrapper = factory({ modelValue: 'b' })
    await wrapper.find('input').trigger('focus')

    expect(wrapper.find('input').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('shows loading, empty, and unavailable states', async () => {
    const empty = buildSearchDropdown([], [])
    const wrapper = factory({ model: empty, loading: true })
    await wrapper.find('input').trigger('focus')
    expect(wrapper.text()).toContain('Searching...')

    await wrapper.setProps({ loading: false })
    expect(wrapper.text()).toContain('No places found')

    await wrapper.setProps({ placesUnavailable: true })
    expect(wrapper.text()).toContain('Google place suggestions unavailable')
    wrapper.unmount()
  })

  it('hover moves the active option', async () => {
    const wrapper = factory()
    await wrapper.find('input').trigger('focus')
    const options = wrapper.findAll('[role="option"]')
    await options[1]!.trigger('mousemove')

    expect(options[1]!.attributes('aria-selected')).toBe('true')
    wrapper.unmount()
  })
})
