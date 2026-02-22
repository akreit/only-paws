import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Input from '~/components/ui/Input.vue'

describe('Input Component', () => {
  it('renders with default props', () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
      },
    })

    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('displays label when provided', () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
        label: 'Email Address',
      },
    })

    expect(wrapper.find('label').text()).toContain('Email Address')
  })

  it('shows required indicator when required', () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
        label: 'Name',
        required: true,
      },
    })

    expect(wrapper.find('.text-red-500').text()).toBe('*')
  })

  it('displays placeholder', () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
        placeholder: 'Enter your email',
      },
    })

    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter your email')
  })

  it('emits update:modelValue when input changes', async () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
      },
    })

    const input = wrapper.find('input')
    await input.setValue('test@example.com')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['test@example.com'])
  })

  it('displays error message when error prop is provided', () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
        error: 'This field is required',
      },
    })

    expect(wrapper.find('.text-red-600').text()).toBe('This field is required')
  })

  it('displays hint message when hint prop is provided', () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
        hint: 'Enter a valid email address',
      },
    })

    expect(wrapper.find('.text-gray-500').text()).toBe('Enter a valid email address')
  })

  it('applies error styles when error is present', () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
        error: 'Invalid input',
      },
    })

    expect(wrapper.find('input').classes()).toContain('border-red-300')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: '',
        disabled: true,
      },
    })

    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.find('input').classes()).toContain('bg-gray-50')
  })

  it('supports different input types', () => {
    const types = ['text', 'email', 'password', 'number', 'tel', 'url'] as const

    types.forEach((type) => {
      const wrapper = mount(Input, {
        props: {
          modelValue: '',
          type,
        },
      })

      expect(wrapper.find('input').attributes('type')).toBe(type)
    })
  })
})
