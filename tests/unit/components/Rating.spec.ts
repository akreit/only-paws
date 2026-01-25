import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Rating from '~/components/ui/Rating.vue'

describe('Rating Component', () => {
  it('renders the correct number of stars', () => {
    const wrapper = mount(Rating, {
      props: {
        modelValue: 0,
        maxRating: 5,
      },
    })

    expect(wrapper.findAll('button')).toHaveLength(5)
  })

  it('displays filled stars based on modelValue', () => {
    const wrapper = mount(Rating, {
      props: {
        modelValue: 3,
        maxRating: 5,
      },
    })

    const stars = wrapper.findAll('svg')
    expect(stars.length).toBe(5)
  })

  it('emits update:modelValue when star is clicked', async () => {
    const wrapper = mount(Rating, {
      props: {
        modelValue: 0,
        readonly: false,
      },
    })

    const thirdStar = wrapper.findAll('button')[2]
    await thirdStar.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3])
  })

  it('does not emit update:modelValue when readonly', async () => {
    const wrapper = mount(Rating, {
      props: {
        modelValue: 3,
        readonly: true,
      },
    })

    const star = wrapper.findAll('button')[0]
    await star.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('shows value when showValue is true', () => {
    const wrapper = mount(Rating, {
      props: {
        modelValue: 4.5,
        showValue: true,
      },
    })

    expect(wrapper.text()).toContain('4.5')
  })

  it('handles different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const

    sizes.forEach((size) => {
      const wrapper = mount(Rating, {
        props: {
          modelValue: 3,
          size,
        },
      })

      expect(wrapper.findAll('button').length).toBeGreaterThan(0)
    })
  })
})

