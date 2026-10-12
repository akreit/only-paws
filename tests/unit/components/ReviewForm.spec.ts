import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ReviewForm from '~/components/location/ReviewForm.vue'
import type { Review } from '~/types'

const createReview = vi.fn()
const updateReview = vi.fn()

const review = { id: 'r1', rating: 4, comment: 'Nice' } as unknown as Review

const RatingStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<button type="button" data-testid="rating" @click="$emit(\'update:modelValue\', 2)" />',
}

function mountForm(props: Record<string, unknown>) {
  return mount(ReviewForm, {
    props,
    global: { stubs: { Rating: RatingStub } },
  })
}

describe('ReviewForm', () => {
  beforeEach(() => {
    createReview.mockReset()
    updateReview.mockReset()
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('useReviews', () => ({ createReview, updateReview, loading: ref(false) }))
  })

  describe('create mode', () => {
    it('limits the comment length from the shared constant', () => {
      const wrapper = mountForm({ locationId: 'loc-1' })

      expect(wrapper.find('textarea').attributes('maxlength')).toBe('2000')
      expect(wrapper.text()).toContain('Write a Review')
      expect(wrapper.text()).not.toContain('Cancel')
    })

    it('requires a rating', async () => {
      const wrapper = mountForm({ locationId: 'loc-1' })

      await wrapper.find('form').trigger('submit')

      expect(createReview).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Please select a rating')
    })

    it('creates the review, resets and emits submitted', async () => {
      createReview.mockResolvedValue({})
      const wrapper = mountForm({ locationId: 'loc-1' })

      await wrapper.find('[data-testid="rating"]').trigger('click')
      await wrapper.find('textarea').setValue('Lovely')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(createReview).toHaveBeenCalledWith({
        locationId: 'loc-1',
        rating: 2,
        comment: 'Lovely',
      })
      expect(wrapper.emitted('submitted')).toHaveLength(1)
      expect(wrapper.find('textarea').element.value).toBe('')
    })

    it('trims the comment and omits a blank one', async () => {
      createReview.mockResolvedValue({})
      const wrapper = mountForm({ locationId: 'loc-1' })

      await wrapper.find('[data-testid="rating"]').trigger('click')
      await wrapper.find('textarea').setValue('  Lovely  ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(createReview).toHaveBeenLastCalledWith({
        locationId: 'loc-1',
        rating: 2,
        comment: 'Lovely',
      })

      await wrapper.find('[data-testid="rating"]').trigger('click')
      await wrapper.find('textarea').setValue('   ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(createReview).toHaveBeenLastCalledWith({
        locationId: 'loc-1',
        rating: 2,
        comment: undefined,
      })
    })

    it('does not create without a location', async () => {
      const wrapper = mountForm({})

      await wrapper.find('[data-testid="rating"]').trigger('click')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(createReview).not.toHaveBeenCalled()
      expect(wrapper.emitted('submitted')).toBeUndefined()
    })

    it('does not emit when creating fails', async () => {
      createReview.mockRejectedValue(new Error('nope'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountForm({ locationId: 'loc-1' })

      await wrapper.find('[data-testid="rating"]').trigger('click')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('submitted')).toBeUndefined()
    })
  })

  describe('edit mode', () => {
    it('prefills the review and offers cancel', async () => {
      const wrapper = mountForm({ review })

      expect(wrapper.find('textarea').element.value).toBe('Nice')
      expect(wrapper.text()).not.toContain('Write a Review')

      const cancel = wrapper.findAll('button').find((b) => b.text() === 'Cancel')!
      await cancel.trigger('click')

      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(updateReview).not.toHaveBeenCalled()
    })

    it('saves the new rating and trimmed comment and emits updated', async () => {
      const updated = { ...review, rating: 2, comment: 'Meh' }
      updateReview.mockResolvedValue(updated)
      const wrapper = mountForm({ review })

      await wrapper.find('[data-testid="rating"]').trigger('click')
      await wrapper.find('textarea').setValue('  Meh  ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(updateReview).toHaveBeenCalledWith('r1', { rating: 2, comment: 'Meh' })
      expect(createReview).not.toHaveBeenCalled()
      expect(wrapper.emitted('updated')?.[0]).toEqual([updated])
    })

    it('sends a null comment when the comment is cleared', async () => {
      updateReview.mockResolvedValue(review)
      const wrapper = mountForm({ review })

      await wrapper.find('textarea').setValue('   ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(updateReview).toHaveBeenCalledWith('r1', { rating: 4, comment: null })
    })

    it('does not emit updated when saving fails', async () => {
      updateReview.mockRejectedValue(new Error('nope'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountForm({ review })

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('updated')).toBeUndefined()
    })
  })
})
