import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'

describe('LoadingSpinner Component', () => {
  it('renders spinner SVG', () => {
    const wrapper = mount(LoadingSpinner)

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('svg').classes()).toContain('animate-spin')
  })

  it('displays text when provided', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        text: 'Loading...',
      },
    })

    expect(wrapper.text()).toContain('Loading...')
  })

  it('applies different sizes correctly', () => {
    const sizes = ['sm', 'md', 'lg'] as const

    sizes.forEach((size) => {
      const wrapper = mount(LoadingSpinner, {
        props: {
          size,
        },
      })

      expect(wrapper.find('svg').exists()).toBe(true)
    })
  })

  it('applies fullScreen class when fullScreen is true', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        fullScreen: true,
      },
    })

    expect(wrapper.classes()).toContain('fixed')
    expect(wrapper.classes()).toContain('inset-0')
  })
})

