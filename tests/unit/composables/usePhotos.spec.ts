import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationsStore } from '~/stores/notifications'
import { usePhotos } from '~/composables/usePhotos'

const fetchMock = vi.fn()
const cloudinaryFetch = vi.fn()
const markChanged = vi.hoisted(() => vi.fn())
vi.mock('~/utils/locations-cache', () => ({ markLocationsChanged: markChanged }))

const file = new File(['x'], 'cat.png', { type: 'image/png' })

describe('usePhotos', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    cloudinaryFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://img/x.png', public_id: 'p1', width: 1, height: 2 }),
    })
    markChanged.mockReset()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('fetch', cloudinaryFetch)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { uploadPreset: 'preset', cloudinaryCloudName: 'cloud' },
    }))
  })

  it('uploadPhoto saves via /api/photos and marks locations changed', async () => {
    fetchMock.mockResolvedValue({ id: 'ph1' })
    const { uploadPhoto, loading, uploadProgress } = usePhotos()

    await expect(uploadPhoto(file, 'loc1', 'hi')).resolves.toEqual({ id: 'ph1' })

    expect(fetchMock).toHaveBeenCalledWith('/api/photos', {
      method: 'POST',
      body: { url: 'https://img/x.png', publicId: 'p1', locationId: 'loc1', caption: 'hi' },
    })
    expect(markChanged).toHaveBeenCalledTimes(1)
    expect(loading.value).toBe(false)
    expect(uploadProgress.value).toBe(0)
  })

  it('does not mark locations changed when the Cloudinary upload fails', async () => {
    cloudinaryFetch.mockResolvedValue({ ok: false })

    await expect(usePhotos().uploadPhoto(file, 'loc1')).rejects.toThrow('Upload failed')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(markChanged).not.toHaveBeenCalled()
  })

  it('does not mark locations changed when saving the photo fails', async () => {
    fetchMock.mockRejectedValue(new Error('nope'))

    await expect(usePhotos().uploadPhoto(file, 'loc1')).rejects.toThrow('nope')

    expect(markChanged).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications.at(-1)?.type).toBe('error')
  })

  it('deletePhoto DELETEs and marks locations changed', async () => {
    fetchMock.mockResolvedValue(undefined)

    await usePhotos().deletePhoto('ph1', 'p1')

    expect(fetchMock).toHaveBeenCalledWith('/api/photos/ph1', {
      method: 'DELETE',
      body: { publicId: 'p1' },
    })
    expect(markChanged).toHaveBeenCalledTimes(1)
  })

  it('does not mark locations changed when delete fails', async () => {
    fetchMock.mockRejectedValue(new Error('nope'))

    await expect(usePhotos().deletePhoto('ph1', 'p1')).rejects.toThrow('nope')

    expect(markChanged).not.toHaveBeenCalled()
  })
})
