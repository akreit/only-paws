import type { Location, ProfileUpdateInput, Review, User } from '~/types'

export interface ProfileResponse {
  user: User
  locations: Location[]
  reviews: Review[]
}

export function useProfile() {
  const userStore = useUserStore()
  const notifications = useNotificationsStore()
  const loading = ref(false)
  const saving = ref(false)

  async function fetchProfile() {
    loading.value = true

    try {
      const data = await $fetch<ProfileResponse>('/api/users/profile')
      userStore.setProfile(data.user)
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
      userStore.setProfile(user)
      notifications.success('Profile updated!')
      return user
    } catch (error) {
      notifications.error('Failed to update profile')
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    loading,
    saving,
    profile: computed(() => userStore.profile),
    fetchProfile,
    saveProfile,
  }
}
