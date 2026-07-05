import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocationType, type CreateLocationInput } from '~/types'
import AddLocationForm from '~/components/location/AddLocationForm.vue'
import { MAX_PHOTO_SIZE_MB } from '~/utils/constants'

const {
  createLocationMock,
  createReviewMock,
  uploadPhotoMock,
  geocodeMock,
  successMock,
  errorMock,
  warningMock,
} = vi.hoisted(() => ({
  createLocationMock: vi.fn(),
  createReviewMock: vi.fn(),
  uploadPhotoMock: vi.fn(),
  geocodeMock: vi.fn(),
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
    geocodeAddress: geocodeMock,
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
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  function createLargeImageFile(name: string, size: number) {
    const file = new File(['image'], name, { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', {
      value: size,
      configurable: true,
    })
    return file
  }

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

  it('handles geocoding empty, unfound, successful, and failed lookups', async () => {
    geocodeMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ lat: 51.5014, lng: -0.1419 })
      .mockRejectedValueOnce(new Error('map service unavailable'))

    const wrapper = mount(AddLocationForm)
    const addressInput = wrapper.find('input[placeholder="123 Main St, City, State"]')
    const geocodeButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Find Coordinates from Address'))

    expect(geocodeButton).toBeTruthy()

    await geocodeButton!.trigger('click')
    expect(errorMock).toHaveBeenCalledWith('Please enter an address first')

    await addressInput.setValue('10 Downing Street, London')

    await geocodeButton!.trigger('click')
    await flushPromises()
    expect(errorMock).toHaveBeenCalledWith('Could not find coordinates for this address')

    await geocodeButton!.trigger('click')
    await flushPromises()
    expect(successMock).toHaveBeenCalledWith('Coordinates found!')
    expect(wrapper.find('input[placeholder="40.7128"]').element).toHaveProperty('value', '51.5014')
    expect(wrapper.find('input[placeholder="-74.0060"]').element).toHaveProperty('value', '-0.1419')

    await geocodeButton!.trigger('click')
    await flushPromises()
    expect(errorMock).toHaveBeenCalledWith('Failed to find coordinates')
  })

  it('shows validation errors and skips submission when required or optional fields are invalid', async () => {
    const wrapper = mount(AddLocationForm)

    await wrapper.find('input[placeholder="https://example.com"]').setValue('not-a-url')
    await wrapper.find('input[placeholder="(555) 123-4567"]').setValue('not-a-phone')
    await wrapper.find('textarea[id="quick-review"]').setValue('Great dog run')

    await wrapper.find('form').trigger('submit.prevent')

    expect(createLocationMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Name is required')
    expect(wrapper.text()).toContain('Type is required')
    expect(wrapper.text()).toContain('Address is required')
    expect(wrapper.text()).toContain('Invalid coordinates')
    expect(wrapper.text()).toContain('Invalid URL')
    expect(wrapper.text()).toContain('Invalid phone number')
    expect(wrapper.text()).toContain('Please add a rating to save your review')
  })

  it('keeps only valid image files, formats sizes, and allows removing selected photos', async () => {
    const wrapper = mount(AddLocationForm)
    const photoInput = wrapper.find('input[type="file"]')

    const smallPhoto = createLargeImageFile('small-dog.jpg', 2 * 1024)
    const mediumPhoto = createLargeImageFile('large-dog.jpg', 2 * 1024 * 1024)
    const invalidFile = new File(['notes'], 'notes.txt', { type: 'text/plain' })
    const oversizedPhoto = createLargeImageFile('too-big.jpg', MAX_PHOTO_SIZE_MB * 1024 * 1024 + 1)

    Object.defineProperty(photoInput.element, 'files', {
      value: [smallPhoto, mediumPhoto, invalidFile, oversizedPhoto],
      configurable: true,
    })

    await photoInput.trigger('change')

    expect(wrapper.text()).toContain('small-dog.jpg')
    expect(wrapper.text()).toContain('large-dog.jpg')
    expect(wrapper.text()).toContain('2 KB')
    expect(wrapper.text()).toContain('2.0 MB')
    expect(errorMock).toHaveBeenCalledWith('notes.txt is not an image file')
    expect(errorMock).toHaveBeenCalledWith(
      `too-big.jpg must be smaller than ${MAX_PHOTO_SIZE_MB}MB`
    )

    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Remove')!
      .trigger('click')

    expect(wrapper.text()).not.toContain('small-dog.jpg')
    expect(wrapper.text()).toContain('large-dog.jpg')
  })

  it('resets review and photo state when the initial location prop changes', async () => {
    const wrapper = mount(AddLocationForm, {
      props: {
        initialLocation: {
          name: 'Original Park',
          type: LocationType.PARK,
          address: '123 Park Ave',
          latitude: 40.7128,
          longitude: -74.006,
        } satisfies Partial<CreateLocationInput>,
      },
    })

    await wrapper.find('textarea[id="quick-review"]').setValue('Needs more shade')

    const photoInput = wrapper.find('input[type="file"]')
    const photo = new File(['photo-one'], 'dog-1.jpg', { type: 'image/jpeg' })
    Object.defineProperty(photoInput.element, 'files', {
      value: [photo],
      configurable: true,
    })
    await photoInput.trigger('change')
    expect(wrapper.text()).toContain('dog-1.jpg')

    await wrapper.setProps({
      initialLocation: {
        name: 'Updated Beach',
        type: LocationType.BEACH,
        address: '456 Coast Rd',
        latitude: 34.0195,
        longitude: -118.4912,
      },
    })

    expect(wrapper.find('input[placeholder="e.g., Central Park Dog Run"]').element).toHaveProperty(
      'value',
      'Updated Beach'
    )
    expect(wrapper.find('textarea[id="quick-review"]').element).toHaveProperty('value', '')
    expect(wrapper.text()).not.toContain('dog-1.jpg')
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

  it('warns when optional review or photo uploads fail after the location is created', async () => {
    createLocationMock.mockResolvedValue({ id: 'loc-456', name: 'Trail Cafe' })
    createReviewMock.mockResolvedValue({ id: 'rev-2' })
    uploadPhotoMock.mockRejectedValue(new Error('upload failed'))

    const wrapper = mount(AddLocationForm, {
      props: {
        lockBasicFields: true,
        showBasicInfoSection: false,
        initialLocation: {
          googlePlaceId: 'google-place-456',
          name: 'Trail Cafe',
          type: LocationType.CAFE,
          address: '456 Trail Rd',
          latitude: 37.7749,
          longitude: -122.4194,
        } satisfies Partial<CreateLocationInput>,
      },
    })

    await wrapper.find('textarea[id="quick-review"]').setValue('Great patio for dogs.')
    const ratingButtons = wrapper.findAll('button[type="button"]')
    await ratingButtons[4].trigger('click')

    const photoInput = wrapper.find('input[type="file"]')
    const photo = new File(['photo'], 'trail-dog.jpg', { type: 'image/jpeg' })
    Object.defineProperty(photoInput.element, 'files', {
      value: [photo],
      configurable: true,
    })
    await photoInput.trigger('change')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(warningMock).toHaveBeenCalledWith(
      'Location added, but some optional review or photo uploads could not be saved.'
    )
    expect(wrapper.emitted('submitted')).toEqual([[{ id: 'loc-456', name: 'Trail Cafe' }]])
  })
})
