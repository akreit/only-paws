import { getAvatarUrl } from '#shared/utils/profile-photo'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import { formatRelativeTime } from '~/utils/formatters'
import ReviewCard from '~/components/location/ReviewCard.vue'
import type { Review, User } from '~/types'

const useAuthSync = vi.fn()
const deleteReview = vi.fn()

const review = {
  id: 'r1',
  rating: 4,
  comment: 'Nice',
  authorId: 'u1',
  createdAt: new Date().toISOString(),
  author: { username: 'me' },
} as unknown as Review

const RatingStub = { props: ['modelValue'], template: '<div data-testid="rating" />' }

const ReviewFormStub = {
  name: 'ReviewForm',
  props: ['review'],
  emits: ['updated', 'cancel'],
  template: '<form data-testid="review-form" />',
}

function mountCard() {
  return mount(ReviewCard, {
    props: { review },
    global: { stubs: { Rating: RatingStub, ReviewForm: ReviewFormStub } },
  })
}

describe('ReviewCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthSync.mockReset()
    deleteReview.mockReset()
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('getAvatarUrl', getAvatarUrl)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('formatRelativeTime', formatRelativeTime)
    vi.stubGlobal('useUserStore', useUserStore)
    vi.stubGlobal('useAuthSync', useAuthSync)
    vi.stubGlobal('useReviews', () => ({ deleteReview }))
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

    it('opens the review form in edit mode and cancel closes it', async () => {
      const wrapper = mountCard()

      await wrapper.find('[data-testid="edit-review"]').trigger('click')
      expect(wrapper.findComponent(ReviewFormStub).props('review')).toEqual(review)
      expect(wrapper.find('[data-testid="edit-review"]').exists()).toBe(false)

      wrapper.findComponent(ReviewFormStub).vm.$emit('cancel')
      await flushPromises()

      expect(wrapper.findComponent(ReviewFormStub).exists()).toBe(false)
      expect(wrapper.text()).toContain('Nice')
    })

    it('closes the form and emits updated once the review is saved', async () => {
      const updated = { ...review, rating: 2, comment: 'Meh' }
      const wrapper = mountCard()

      await wrapper.find('[data-testid="edit-review"]').trigger('click')
      wrapper.findComponent(ReviewFormStub).vm.$emit('updated', updated)
      await flushPromises()

      expect(wrapper.emitted('updated')?.[0]).toEqual([updated])
      expect(wrapper.findComponent(ReviewFormStub).exists()).toBe(false)
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

    it('keeps the review when deleting fails', async () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
      deleteReview.mockRejectedValue(new Error('nope'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountCard()

      await wrapper.find('[data-testid="delete-review"]').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('delete')).toBeUndefined()
    })
  })
})
