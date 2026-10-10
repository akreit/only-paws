import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import ReviewCard from '~/components/location/ReviewCard.vue'
import type { Review, User } from '~/types'

const useAuthSync = vi.fn()

const review = {
  id: 'r1',
  rating: 4,
  comment: 'Nice',
  authorId: 'u1',
  createdAt: new Date().toISOString(),
  author: { username: 'me' },
} as unknown as Review

function mountCard() {
  return mount(ReviewCard, {
    props: { review },
    global: { stubs: { Rating: true } },
  })
}

describe('ReviewCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthSync.mockReset()
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useUserStore', useUserStore)
    vi.stubGlobal('useAuthSync', useAuthSync)
    vi.stubGlobal('useReviews', () => ({ deleteReview: vi.fn() }))
  })

  it('shows delete for the author without registering another auth sync', () => {
    useUserStore().setUser({ id: 'u1' } as User)

    expect(mountCard().find('button').exists()).toBe(true)
    expect(useAuthSync).not.toHaveBeenCalled()
  })

  it('hides delete for other users', () => {
    useUserStore().setUser({ id: 'u2' } as User)

    expect(mountCard().find('button').exists()).toBe(false)
  })
})
