import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import MapLocationPanel from '~/components/location/MapLocationPanel.vue'
import type { Location } from '~/types'
import { createMockLocation, createMockPhoto } from '../../fixtures/factories'

let wrapper: VueWrapper | undefined

function factory(overrides: Partial<Location> = {}) {
  wrapper = mount(MapLocationPanel, {
    attachTo: document.body,
    props: { location: createMockLocation(overrides) },
    global: {
      stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
    },
  })
  return wrapper
}

afterEach(() => wrapper?.unmount())

describe('MapLocationPanel', () => {
  it('renders the stored summary', () => {
    const w = factory({
      photos: [createMockPhoto({ url: 'https://img.test/a.jpg' })],
      averageRating: 4.5,
      _count: { reviews: 3, photos: 1, favorites: 7 },
      breedRestrictions: 'No pit bulls',
    })

    expect(w.attributes('role')).toBe('dialog')
    expect(w.find('h2').text()).toBe('Test Dog Park')
    expect(w.attributes('aria-labelledby')).toBe(w.find('h2').attributes('id'))
    expect(w.text()).toContain('Park')
    expect(w.text()).toContain('(3 reviews)')
    expect(w.text()).toContain('7')
    expect(w.text()).toContain('123 Test Street')
    expect(w.text()).toContain('A great place for dogs')
    expect(w.text()).toContain('Off-leash area')
    expect(w.text()).toContain('Leash optional')
    expect(w.text()).toContain('No pit bulls')
    expect(w.text()).toContain('Water bowls')
    expect(w.find('a[href="tel:+1 555-123-4567"]').exists()).toBe(true)
    expect(w.find('a[href="https://example.com"]').exists()).toBe(true)

    const img = w.find('img')
    expect(img.attributes('src')).toBe('https://img.test/a.jpg')
    expect(img.attributes('alt')).toBeTruthy()
    expect(img.attributes('loading')).toBe('lazy')
    expect(img.attributes('decoding')).toBe('async')
  })

  it('omits missing optional fields', () => {
    const w = factory({
      description: undefined,
      website: undefined,
      phone: undefined,
      leashRequired: undefined,
      offLeashArea: undefined,
      amenities: undefined,
    })

    expect(w.find('img').exists()).toBe(false)
    expect(w.find('ul[aria-label="Dog-friendly features"]').exists()).toBe(false)
    expect(w.find('a[href^="tel:"]').exists()).toBe(false)
    expect(w.text()).toContain('(0 reviews)')
    expect(w.text()).not.toContain('Website')
  })

  it('links Details to the full place page', () => {
    const w = factory({ id: 'abc' })

    const link = w.findAll('a').find((a) => a.text() === 'Details')
    expect(link?.attributes('href')).toBe('/locations/abc')
  })

  it('emits close from the X button and the Escape key', async () => {
    const w = factory()

    await w.find('button[aria-label="Close place details"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))

    expect(w.emitted('close')).toHaveLength(2)
  })

  it('focuses the heading when opened', async () => {
    const w = factory()
    await w.vm.$nextTick()
    await w.vm.$nextTick()

    expect(document.activeElement).toBe(w.find('h2').element)
  })
})
