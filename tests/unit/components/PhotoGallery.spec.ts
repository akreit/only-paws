import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import { useNotificationsStore } from '~/stores/notifications'
import PhotoGallery from '~/components/location/PhotoGallery.vue'
import type { Photo, User } from '~/types'

const photos = [
  {
    id: 'p1',
    url: 'http://img/1',
    publicId: 'a',
    uploaderId: 'db-user-1',
    createdAt: new Date().toISOString(),
  },
] as unknown as Photo[]

const slotStub = { template: '<div><slot /></div>' }

async function mountGallery() {
  const wrapper = mount(PhotoGallery, {
    props: { locationId: 'l1', photos },
    global: { stubs: { Button: slotStub, Modal: slotStub } },
  })
  // Open the lightbox, where the delete button lives
  await wrapper.find('.aspect-square').trigger('click')
  return wrapper
}

describe('PhotoGallery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('useAuth', () => ({ isSignedIn: ref(true) }))
    // Clerk's id must not be what decides ownership
    vi.stubGlobal('useUser', () => ({ user: ref({ id: 'clerk_1' }) }))
    vi.stubGlobal('useUserStore', useUserStore)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
    vi.stubGlobal('usePhotos', () => ({
      uploadPhoto: vi.fn(),
      deletePhoto: vi.fn(),
      loading: ref(false),
      uploadProgress: ref(0),
    }))
  })

  it('shows delete for the uploader, matched by database id', async () => {
    useUserStore().setUser({ id: 'db-user-1' } as User)

    expect((await mountGallery()).text()).toContain('Delete')
  })

  it('hides delete for other users', async () => {
    useUserStore().setUser({ id: 'db-user-2' } as User)

    expect((await mountGallery()).text()).not.toContain('Delete')
  })
})
