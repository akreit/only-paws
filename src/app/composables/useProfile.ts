import type { CloudinaryUploadResult, Location, ProfileUpdateInput, Review, User } from '~/types'

export interface ProfileResponse {
  user: User
  locations: Location[]
  reviews: Review[]
}

export function useProfile() {
  const config = useRuntimeConfig()
  const userStore = useUserStore()
  const notifications = useNotificationsStore()
  const loading = ref(false)
  const saving = ref(false)
  const photoSaving = ref(false)

  async function fetchProfile() {
    loading.value = true

    try {
      const data = await $fetch<ProfileResponse>('/api/users/profile')
      userStore.setUser(data.user)
      return data
    } catch (error) {
      notifications.error('Failed to load profile')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function saveProfile(updates: ProfileUpdateInput) {
    saving.value = true

    try {
      const user = await $fetch<User>('/api/users/profile', {
        method: 'PATCH',
        body: updates,
      })
      userStore.setUser(user)
      notifications.success('Profile updated!')
      return user
    } catch (error) {
      notifications.error('Failed to update profile')
      throw error
    } finally {
      saving.value = false
    }
  }

  // Same unsigned-preset upload as usePhotos, but with the dedicated profile preset when configured
  async function uploadToCloudinary(file: File, folder: string): Promise<CloudinaryUploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    formData.append('upload_preset', resolveProfileUploadPreset(config.public))

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.public.cloudinaryCloudName}/image/upload`,
      { method: 'POST', body: formData }
    )
    if (!response.ok) throw new Error('Upload failed')

    const data = await response.json()
    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
    }
  }

  async function uploadProfilePhoto(file: File) {
    const problem = validateProfilePhotoFile(file)
    if (problem) {
      notifications.error(problem)
      throw new Error(problem)
    }

    photoSaving.value = true
    try {
      const userId = userStore.user?.id
      if (!userId) throw new Error('Profile not loaded')
      const { publicId, format } = await uploadToCloudinary(file, `only-paws/users/${userId}`)
      const user = await $fetch<User>('/api/users/profile-photo', {
        method: 'PUT',
        body: { publicId, format },
      })
      userStore.setUser(user)
      notifications.success('Profile photo updated!')
      return user
    } catch (error) {
      notifications.error('Failed to update profile photo')
      throw error
    } finally {
      photoSaving.value = false
    }
  }

  async function removeProfilePhoto() {
    photoSaving.value = true
    try {
      const user = await $fetch<User>('/api/users/profile-photo', { method: 'DELETE' })
      userStore.setUser(user)
      notifications.success('Profile photo removed')
      return user
    } catch (error) {
      notifications.error('Failed to remove profile photo')
      throw error
    } finally {
      photoSaving.value = false
    }
  }

  return {
    loading,
    saving,
    photoSaving,
    uploadProfilePhoto,
    removeProfilePhoto,
    profile: computed(() => userStore.user),
    fetchProfile,
    saveProfile,
  }
}
