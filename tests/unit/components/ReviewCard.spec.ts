import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import ReviewCard from '~/components/location/ReviewCard.vue'
import type { Review, User } from '~/types'

const useAuthSync = vi.fn()
const updateReview = vi.fn()
const deleteReview = vi.fn()

const review = {
  id: 'r1',
  rating: 4,
  comment: 'Nice',
  authorId: 'u1',
  createdAt: new Date().toISOString(),
  author: { username: 'me' },
} as unknown as Review

const RatingStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<button type="button" data-testid="rating" @click="$emit(\'update:modelValue\', 2)" />',
}

function mountCard() {
  return mount(ReviewCard, {
    props: { review },
    global: { stubs: { Rating: RatingStub } },
  })
}

describe('ReviewCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthSync.mockReset()
    updateReview.mockReset()
    deleteReview.mockReset()
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useUserStore', useUserStore)
    vi.stubGlobal('useAuthSync', useAuthSync)
    vi.stubGlobal('useReviews', () => ({ updateReview, deleteReview, loading: ref(false) }))
  })

  it('shows edit and delete for the author without registering another auth sync', () => {
    useUserStore().setUser({ id: 'u1' } as User)
    const wrapper = mountCard()

    expect(wrapper.find('[data-testid="edit-review"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="delete-review"]').exists()).toBe(true)
    expect(useAuthSync).not.toHaveBeenCalled()
  })

  it('hides edit and delete for other users', () => {
    useUserStore().setUser({ id: 'u2' } as User)
    const wrapper = mountCard()

    expect(wrapper.find('[data-testid="edit-review"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delete-review"]').exists()).toBe(false)
  })

  it('hides edit and delete when signed out', () => {
    const wrapper = mountCard()

    expect(wrapper.find('[data-testid="edit-review"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delete-review"]').exists()).toBe(false)
  })

  describe('editing', () => {
    beforeEach(() => {
      useUserStore().setUser({ id: 'u1' } as User)
    })

    it('opens a prefilled form and cancel discards the draft', async () => {
      const wrapper = mountCard()

      await wrapper.find('[data-testid="edit-review"]').trigger('click')
      const textarea = wrapper.find('textarea')
      expect(textarea.element.value).toBe('Nice')

      await textarea.setValue('Changed')
      const cancel = wrapper.findAll('button').find((b) => b.text() === 'Cancel')!
      await cancel.trigger('click')

      expect(wrapper.find('form').exists()).toBe(false)
      expect(wrapper.text()).toContain('Nice')
      expect(updateReview).not.toHaveBeenCalled()

      await wrapper.find('[data-testid="edit-review"]').trigger('click')
      expect(wrapper.find('textarea').element.value).toBe('Nice')
    })

    it('saves the new rating and comment and emits updated', async () => {
      const updated = { ...review, rating: 2, comment: 'Meh' }
      updateReview.mockResolvedValue(updated)
      const wrapper = mountCard()

      await wrapper.find('[data-testid="edit-review"]').trigger('click')
      await wrapper.find('[data-testid="rating"]').trigger('click')
      await wrapper.find('textarea').setValue('  Meh  ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(updateReview).toHaveBeenCalledWith('r1', { rating: 2, comment: 'Meh' })
      expect(wrapper.emitted('updated')?.[0]).toEqual([updated])
      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('sends a null comment when the comment is cleared', async () => {
      updateReview.mockResolvedValue(review)
      const wrapper = mountCard()

      await wrapper.find('[data-testid="edit-review"]').trigger('click')
      await wrapper.find('textarea').setValue('   ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(updateReview).toHaveBeenCalledWith('r1', { rating: 4, comment: null })
    })

    it('keeps the form open when saving fails', async () => {
      updateReview.mockRejectedValue(new Error('nope'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountCard()

      await wrapper.find('[data-testid="edit-review"]').trigger('click')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.emitted('updated')).toBeUndefined()
    })

    it('does not save without a valid rating', async () => {
      const wrapper = mount(ReviewCard, {
        props: { review: { ...review, rating: 0 } as Review },
        global: { stubs: { Rating: RatingStub } },
      })

      await wrapper.find('[data-testid="edit-review"]').trigger('click')
      await wrapper.find('form').trigger('submit')

      expect(updateReview).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Please select a rating')
    })

    it('deletes after confirmation', async () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
      deleteReview.mockResolvedValue(undefined)
      const wrapper = mountCard()

      await wrapper.find('[data-testid="delete-review"]').trigger('click')
      await flushPromises()

      expect(deleteReview).toHaveBeenCalledWith('r1')
      expect(wrapper.emitted('delete')).toHaveLength(1)
    })
  })
})
