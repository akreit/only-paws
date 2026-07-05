import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Select from '~/components/ui/Select.vue'

describe('Select Component', () => {
  it('renders label, required marker, placeholder, and hint', () => {
    const wrapper = mount(Select, {
      props: {
        modelValue: '',
        label: 'Location Type',
        required: true,
        placeholder: 'Choose a type',
        hint: 'Pick the best match',
        options: [
          { label: 'Park', value: 'park' },
          { label: 'Cafe', value: 'cafe' },
        ],
      },
    })

    expect(wrapper.find('label').text()).toContain('Location Type')
    expect(wrapper.find('.text-red-500').text()).toBe('*')
    expect(wrapper.find('option[disabled]').text()).toBe('Choose a type')
    expect(wrapper.find('.text-gray-500').text()).toBe('Pick the best match')
  })

  it('emits update:modelValue when a new option is selected', async () => {
    const wrapper = mount(Select, {
      props: {
        modelValue: '',
        options: [
          { label: 'Park', value: 'park' },
          { label: 'Cafe', value: 'cafe' },
        ],
      },
    })

    await wrapper.find('select').setValue('cafe')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['cafe'])
  })

  it('shows error styles and message when an error is provided', () => {
    const wrapper = mount(Select, {
      props: {
        modelValue: 'park',
        error: 'Please choose a type',
        hint: 'This hint should be hidden by the error',
        options: [{ label: 'Park', value: 'park' }],
      },
    })

    expect(wrapper.find('select').classes()).toContain('border-red-300')
    expect(wrapper.find('.text-red-600').text()).toBe('Please choose a type')
    expect(wrapper.text()).not.toContain('This hint should be hidden by the error')
  })

  it('supports the disabled state', () => {
    const wrapper = mount(Select, {
      props: {
        modelValue: 'park',
        disabled: true,
        options: [{ label: 'Park', value: 'park' }],
      },
    })

    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
    expect(wrapper.find('select').classes()).toContain('bg-gray-50')
  })
})
