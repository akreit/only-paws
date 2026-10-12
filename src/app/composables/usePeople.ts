import type {
  PeopleFilters,
  PeopleSearchResponse,
  PeopleSettings,
  PeopleSettingsInput,
} from '~/types'

interface FetchError {
  statusCode?: number
  data?: { message?: string; data?: { retryAt?: string } }
}

/** Formats the server's `retryAt` in the user's local time; empty when absent or invalid. */
function localRetryTime(error: unknown): string {
  const retryAt = ((error ?? {}) as FetchError).data?.data?.retryAt
  const date = retryAt ? new Date(retryAt) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : ''
}

function rateLimitMessage(error: unknown, subject: string): string {
  const time = localRetryTime(error)
  return time ? `${subject} after ${time}.` : `${subject} later.`
}

/** The search API answers 400 with this wording when the searcher has no stored location. */
function isMissingLocation(error: unknown): boolean {
  const { statusCode, data } = (error ?? {}) as FetchError
  return statusCode === 400 && /approximate location/i.test(data?.message ?? '')
}

function toQuery(filters: PeopleFilters) {
  const query: Record<string, string | number> = {}
  if (filters.radius) query.radius = filters.radius
  if (filters.breed?.trim()) query.breed = filters.breed.trim()
  if (filters.lookingFor?.length) query.lookingFor = filters.lookingFor.join(',')
  if (filters.hasDog) query.hasDog = 'true'
  if (filters.page) query.page = filters.page
  if (filters.pageSize) query.pageSize = filters.pageSize
  return query
}

export function usePeople() {
  const userStore = useUserStore()
  const notifications = useNotificationsStore()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const needsLocation = ref(false)
  const needsOptIn = ref(false)
  const cooldownMessage = ref('')

  async function searchPeople(filters: PeopleFilters = {}) {
    loading.value = true
    error.value = null
    needsLocation.value = false
    needsOptIn.value = false

    try {
      return await $fetch<PeopleSearchResponse>('/api/people', { query: toQuery(filters) })
    } catch (e) {
      const { statusCode } = (e ?? {}) as FetchError
      if (isMissingLocation(e)) {
        needsLocation.value = true
      } else if (statusCode === 403) {
        needsOptIn.value = true
      } else if (statusCode === 429) {
        error.value = rateLimitMessage(e, 'You have searched a lot. Try again')
      } else {
        error.value = 'Could not load people. Please try again.'
      }
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePeopleSettings(input: PeopleSettingsInput) {
    saving.value = true
    cooldownMessage.value = ''

    try {
      const settings = await $fetch<PeopleSettings>('/api/users/people-settings', {
        method: 'PATCH',
        body: input,
      })
      if (userStore.user) userStore.setUser({ ...userStore.user, ...settings })
      notifications.success('Meet people settings saved')
      return settings
    } catch (e) {
      if ((e as FetchError).statusCode === 429) {
        cooldownMessage.value = rateLimitMessage(e, 'You can change your location again')
      }
      const message = cooldownMessage.value || (e as FetchError).data?.message
      notifications.error(message || 'Failed to save Meet people settings')
      throw e
    } finally {
      saving.value = false
    }
  }

  return {
    loading,
    saving,
    error,
    needsLocation,
    needsOptIn,
    cooldownMessage,
    searchPeople,
    updatePeopleSettings,
  }
}
