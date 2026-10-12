import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, onMounted, ref } from 'vue'
import { mount } from '@vue/test-utils'
import LocationPage from '~/pages/locations/[id].vue'

const fetchLocation = vi.fn()
const isSignedIn = ref(false)

const location = {
  id: 'loc-1',
  name: 'Bark Park',
  type: 'PARK',
  reviews: [],
  photos: [],
}

function mountPage() {
  return mount(LocationPage, {
    global: {
      stubs: {
        LocationInfo: true,
        DogFeatures: true,
        FavoriteButton: true,
        ReviewForm: true,
        ReviewCard: true,
        PhotoGallery: true,
        EditLocationModal: {
          name: 'EditLocationModal',
          props: ['modelValue', 'location'],
          template: '<div data-testid="edit-modal" />',
        },
        NuxtLink: true,
      },
    },
  })
}

describe('location page edit control', () => {
  beforeEach(() => {
    fetchLocation.mockReset().mockResolvedValue(location)
    isSignedIn.value = false
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useRoute', () => ({ params: { id: 'loc-1' } }))
    vi.stubGlobal('useAuth', () => ({ isSignedIn }))
    vi.stubGlobal('useLocations', () => ({
      fetchLocation,
      selectedLocation: ref(location),
      error: ref(null),
    }))
  })

  it('hides the edit button from signed-out users', () => {
    const wrapper = mountPage()

    expect(wrapper.find('[data-testid="edit-location"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-modal"]').exists()).toBe(false)
  })

  it('shows the edit button to signed-in users and opens the editor', async () => {
    isSignedIn.value = true
    const wrapper = mountPage()

    const button = wrapper.find('[data-testid="edit-location"]')
    expect(button.exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'EditLocationModal' }).props('modelValue')).toBe(false)

    await button.trigger('click')

    expect(wrapper.findComponent({ name: 'EditLocationModal' }).props('modelValue')).toBe(true)
  })
})
