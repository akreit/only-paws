import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationsStore } from '~/stores/notifications'
import { useReviews } from '~/composables/useReviews'

const fetchMock = vi.fn()
const markChanged = vi.hoisted(() => vi.fn())
vi.mock('~/utils/locations-cache', () => ({ markLocationsChanged: markChanged }))

describe('useReviews', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    markChanged.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
  })

  it('createReview POSTs and marks locations changed', async () => {
    fetchMock.mockResolvedValue({ id: 'r1' })
    const { createReview, loading } = useReviews()

    await expect(createReview({ rating: 5 } as never)).resolves.toEqual({ id: 'r1' })

    expect(fetchMock).toHaveBeenCalledWith('/api/reviews', {
      method: 'POST',
      body: { rating: 5 },
    })
    expect(markChanged).toHaveBeenCalledTimes(1)
    expect(loading.value).toBe(false)
  })

  it('deleteReview DELETEs and marks locations changed', async () => {
    fetchMock.mockResolvedValue(undefined)

    await useReviews().deleteReview('r1')

    expect(fetchMock).toHaveBeenCalledWith('/api/reviews/r1', { method: 'DELETE' })
    expect(markChanged).toHaveBeenCalledTimes(1)
  })

  it('updateReview PATCHes, notifies and marks locations changed', async () => {
    fetchMock.mockResolvedValue({ id: 'r1', rating: 3 })
    const { updateReview, loading } = useReviews()

    await expect(updateReview('r1', { rating: 3, comment: null })).resolves.toEqual({
      id: 'r1',
      rating: 3,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/reviews/r1', {
      method: 'PATCH',
      body: { rating: 3, comment: null },
    })
    expect(markChanged).toHaveBeenCalledTimes(1)
    expect(loading.value).toBe(false)
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'success' })
  })

  it('updateReview notifies and does not mark locations changed on failure', async () => {
    fetchMock.mockRejectedValue(new Error('nope'))
    const { updateReview, loading } = useReviews()

    await expect(updateReview('r1', { rating: 3 })).rejects.toThrow('nope')

    expect(markChanged).not.toHaveBeenCalled()
    expect(loading.value).toBe(false)
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error' })
  })

  it('does not mark locations changed when a write fails', async () => {
    fetchMock.mockRejectedValue(new Error('nope'))
    const { createReview, deleteReview } = useReviews()

    await expect(createReview({} as never)).rejects.toThrow('nope')
    await expect(deleteReview('r1')).rejects.toThrow('nope')

    expect(markChanged).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications).toHaveLength(2)
  })
})
