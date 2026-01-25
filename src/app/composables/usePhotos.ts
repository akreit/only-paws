import type { CreatePhotoInput, Photo, CloudinaryUploadResult } from '~/types'

export function usePhotos() {
  const notifications = useNotificationsStore()
  const config = useRuntimeConfig()
  const loading = ref(false)
  const uploadProgress = ref(0)

  async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', config.public.uploadPreset as string)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.public.cloudinaryCloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const data = await response.json()

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    }
  }

  async function uploadPhoto(file: File, locationId: string, caption?: string) {
    loading.value = true
    uploadProgress.value = 0

    try {
      // Upload to Cloudinary
      uploadProgress.value = 50
      const cloudinaryResult = await uploadToCloudinary(file)

      uploadProgress.value = 75

      // Save to database
      const input: CreatePhotoInput = {
        url: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
        locationId,
        caption,
      }

      const photo = await $fetch<Photo>('/api/photos', {
        method: 'POST',
        body: input,
      })

      uploadProgress.value = 100
      notifications.success('Photo uploaded successfully!')
      return photo
    } catch (error) {
      notifications.error('Failed to upload photo')
      throw error
    } finally {
      loading.value = false
      uploadProgress.value = 0
    }
  }

  async function deletePhoto(id: string, publicId: string) {
    loading.value = true

    try {
      await $fetch(`/api/photos/${id}`, {
        method: 'DELETE',
        body: { publicId },
      })

      notifications.success('Photo deleted successfully!')
    } catch (error) {
      notifications.error('Failed to delete photo')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    uploadProgress,
    uploadPhoto,
    deletePhoto,
  }
}

