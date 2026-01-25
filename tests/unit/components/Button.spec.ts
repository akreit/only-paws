import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '~/components/ui/Button.vue'

describe('Button Component', () => {
  it('renders with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me',
      },
    })

    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('applies primary variant styles', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'primary',
      },
      slots: {
        default: 'Primary',
      },
    })

    expect(wrapper.find('button').classes()).toContain('bg-blue-600')
  })

  it('applies secondary variant styles', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'secondary',
      },
      slots: {
        default: 'Secondary',
      },
    })

    expect(wrapper.find('button').classes()).toContain('bg-gray-600')
  })

  it('shows loading spinner when loading', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true,
      },
      slots: {
        default: 'Loading',
      },
    })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('svg').classes()).toContain('animate-spin')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true,
      },
      slots: {
        default: 'Disabled',
      },
    })

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('is disabled when loading', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true,
      },
      slots: {
        default: 'Loading',
      },
    })

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me',
      },
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true,
      },
      slots: {
        default: 'Disabled',
      },
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('applies full width styles when fullWidth is true', () => {
    const wrapper = mount(Button, {
      props: {
        fullWidth: true,
      },
      slots: {
        default: 'Full Width',
      },
    })

    expect(wrapper.find('button').classes()).toContain('w-full')
  })

  it('applies different sizes correctly', () => {
    const sizes = ['sm', 'md', 'lg'] as const

    sizes.forEach((size) => {
      const wrapper = mount(Button, {
        props: {
          size,
        },
        slots: {
          default: 'Button',
        },
      })

      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
    })
  })
})

