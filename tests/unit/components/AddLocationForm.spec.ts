import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { LocationType, type CreateLocationInput } from '~/types'
import AddLocationForm from '~/components/location/AddLocationForm.vue'

const {
  createLocationMock,
  createReviewMock,
  uploadPhotoMock,
  successMock,
  errorMock,
  warningMock,
} = vi.hoisted(() => ({
  createLocationMock: vi.fn(),
  createReviewMock: vi.fn(),
  uploadPhotoMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  warningMock: vi.fn(),
}))

vi.mock('~/composables/useLocations', () => ({
  useLocations: () => ({
    createLocation: createLocationMock,
    loading: ref(false),
  }),
}))

vi.mock('~/composables/useMap', () => ({
  useMap: () => ({
    geocodeAddress: vi.fn(),
  }),
}))

vi.mock('~/composables/useReviews', () => ({
  useReviews: () => ({
    createReview: createReviewMock,
    loading: ref(false),
  }),
}))

vi.mock('~/composables/usePhotos', () => ({
  usePhotos: () => ({
    uploadPhoto: uploadPhotoMock,
    loading: ref(false),
    uploadProgress: ref(0),
  }),
}))

vi.mock('~/stores/notifications', () => ({
  useNotificationsStore: () => ({
    success: successMock,
    error: errorMock,
    warning: warningMock,
  }),
}))

describe('AddLocationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides redundant Google details in compact quick-add mode', () => {
    const wrapper = mount(AddLocationForm, {
      props: {
        lockBasicFields: true,
        showBasicInfoSection: false,
        initialLocation: {
          name: 'Bark Park',
          type: LocationType.PARK,
          address: '123 Park Ave',
          latitude: 40.7128,
          longitude: -74.006,
          website: 'https://example.com',
          phone: '123-456-7890',
          hours: 'Mon-Fri 9-5',
        } satisfies Partial<CreateLocationInput>,
      },
    })

    expect(wrapper.html()).toContain('Google Maps details will be saved automatically')
    expect(wrapper.html()).not.toContain('Address')
    expect(wrapper.html()).not.toContain('Latitude')
    expect(wrapper.html()).not.toContain('Longitude')
    expect(wrapper.html()).not.toContain('Website')
    expect(wrapper.html()).not.toContain('Phone')
    expect(wrapper.html()).not.toContain('Find Coordinates from Address')
  })

  it('submits Google basic info together with dog-friendly fields, review, and photos', async () => {
    createLocationMock.mockResolvedValue({ id: 'loc-123', name: 'Bark Park' })
    createReviewMock.mockResolvedValue({ id: 'rev-1' })
    uploadPhotoMock.mockResolvedValue({ id: 'photo-1' })

    const wrapper = mount(AddLocationForm, {
      props: {
        lockBasicFields: true,
        showBasicInfoSection: false,
        initialLocation: {
          googlePlaceId: 'google-place-123',
          name: 'Bark Park',
          type: LocationType.PARK,
          address: '123 Park Ave',
          latitude: 40.7128,
          longitude: -74.006,
          website: 'https://example.com',
          phone: '123-456-7890',
          hours: 'Mon-Fri 9-5',
        } satisfies Partial<CreateLocationInput>,
      },
    })

    await wrapper.find('input[id="leashRequired"]').setValue(true)
    await wrapper.find('input[id="offLeashArea"]').setValue(true)
    await wrapper.find('input[id="amenity-Water bowls"]').setValue(true)

    const ratingButtons = wrapper.findAll('button[type="button"]')
    await ratingButtons[2].trigger('click')
    await wrapper.find('textarea[id="quick-review"]').setValue('Lots of shade and water bowls.')

    const photoInput = wrapper.find('input[type="file"]')
    const photoOne = new File(['photo-one'], 'dog-1.jpg', { type: 'image/jpeg' })
    const photoTwo = new File(['photo-two'], 'dog-2.png', { type: 'image/png' })
    Object.defineProperty(photoInput.element, 'files', {
      value: [photoOne, photoTwo],
      configurable: true,
    })
    await photoInput.trigger('change')

    await wrapper.find('form').trigger('submit.prevent')

    expect(createLocationMock).toHaveBeenCalledWith({
      googlePlaceId: 'google-place-123',
      name: 'Bark Park',
      type: LocationType.PARK,
      address: '123 Park Ave',
      latitude: 40.7128,
      longitude: -74.006,
      website: 'https://example.com',
      phone: '123-456-7890',
      hours: 'Mon-Fri 9-5',
      description: undefined,
      leashRequired: true,
      breedRestrictions: undefined,
      offLeashArea: true,
      amenities: ['Water bowls'],
    })
    expect(createReviewMock).toHaveBeenCalledWith({
      locationId: 'loc-123',
      rating: 3,
      comment: 'Lots of shade and water bowls.',
    })
    expect(uploadPhotoMock).toHaveBeenNthCalledWith(1, photoOne, 'loc-123')
    expect(uploadPhotoMock).toHaveBeenNthCalledWith(2, photoTwo, 'loc-123')
    expect(wrapper.emitted('submitted')).toEqual([[{ id: 'loc-123', name: 'Bark Park' }]])
  })
})
