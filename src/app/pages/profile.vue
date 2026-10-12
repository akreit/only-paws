<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner size="lg" text="Loading profile..." />
    </div>

    <div v-else-if="!isSignedIn" class="py-12 text-center">
      <svg
        class="mx-auto mb-4 h-16 w-16 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <h2 class="mb-2 text-2xl font-bold text-gray-900">Sign In Required</h2>
      <p class="mb-6 text-gray-600">Please sign in to view your profile</p>
      <NuxtLink to="/sign-in">
        <Button variant="primary">Sign In</Button>
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <!-- Profile Header -->
      <div class="rounded-lg bg-white p-6 shadow-md">
        <div class="flex items-center gap-6">
          <img
            v-if="avatarSrc"
            :src="avatarSrc"
            :alt="user?.username || 'User'"
            class="h-24 w-24 rounded-full border-4 border-gray-200 object-cover"
          />
          <div
            v-else
            class="flex h-24 w-24 items-center justify-center rounded-full border-4 border-gray-200 bg-gray-200"
          >
            <svg class="h-12 w-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clip-rule="evenodd"
              />
            </svg>
          </div>

          <div class="flex-1">
            <h1 class="text-3xl font-bold text-gray-900">
              {{ user?.username || user?.firstName || 'User' }}
            </h1>
            <p v-if="user?.primaryEmailAddress?.emailAddress" class="mt-1 text-gray-600">
              {{ user.primaryEmailAddress.emailAddress }}
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <input
                ref="photoInput"
                type="file"
                :accept="PROFILE_PHOTO_ACCEPT"
                class="hidden"
                data-testid="profile-photo-input"
                @change="handlePhotoSelected"
              />
              <Button
                variant="outline"
                size="sm"
                :loading="photoSaving"
                @click="photoInput?.click()"
              >
                {{ profile?.profilePhotoUrl ? 'Replace photo' : 'Upload photo' }}
              </Button>
              <Button
                v-if="profile?.profilePhotoUrl"
                variant="ghost"
                size="sm"
                :disabled="photoSaving"
                @click="removeProfilePhoto"
              >
                Remove photo
              </Button>
            </div>
            <p v-if="photoError" class="mt-1 text-sm text-red-600">{{ photoError }}</p>
            <p v-else class="mt-1 text-xs text-gray-500">JPEG, PNG or WebP, up to 5 MB.</p>
          </div>
        </div>
      </div>

      <!-- About me -->
      <div class="rounded-lg bg-white p-6 shadow-md">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">About me</h2>
          <Button v-if="!editing" variant="outline" size="sm" @click="startEditing">Edit</Button>
        </div>

        <form v-if="editing" class="space-y-4" @submit.prevent="handleSave">
          <div>
            <label for="profile-bio" class="mb-1 block text-sm font-medium text-gray-700">
              Bio
            </label>
            <textarea
              id="profile-bio"
              v-model="form.bio"
              rows="4"
              placeholder="Tell other dog lovers about yourself 🐾"
              class="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
            />
            <p
              :class="[
                'mt-1 text-sm',
                bioCount > PROFILE_LIMITS.bio ? 'text-red-600' : 'text-gray-500',
              ]"
            >
              {{ bioCount }}/{{ PROFILE_LIMITS.bio }}
            </p>
            <p v-if="errors.bio" class="mt-1 text-sm text-red-600">{{ errors.bio }}</p>
          </div>

          <div>
            <Input
              id="profile-instagram"
              v-model="form.instagramHandle"
              label="Instagram"
              placeholder="@yourdog"
              :error="errors.instagramHandle"
            />
          </div>

          <Input
            id="profile-city"
            v-model="form.homeCity"
            label="Home city"
            :error="errors.homeCity"
          />

          <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input v-model="form.hasDog" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
            I have a dog
          </label>

          <div v-if="form.hasDog" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="profile-dog-name"
              v-model="form.dogName"
              label="Dog's name"
              :error="errors.dogName"
            />
            <Input
              id="profile-dog-breed"
              v-model="form.dogBreed"
              label="Dog's breed"
              :error="errors.dogBreed"
            />
          </div>

          <fieldset>
            <legend class="mb-2 text-sm font-medium text-gray-700">I'm looking for</legend>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in LOOKING_FOR_VALUES"
                :key="option"
                type="button"
                :aria-pressed="form.lookingFor.includes(option)"
                :class="[
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  form.lookingFor.includes(option)
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400',
                ]"
                @click="toggleLookingFor(option)"
              >
                {{ LOOKING_FOR_LABELS[option] }}
              </button>
            </div>
            <p v-if="errors.lookingFor" class="mt-1 text-sm text-red-600">
              {{ errors.lookingFor }}
            </p>
          </fieldset>

          <div class="flex gap-2">
            <Button type="submit" variant="primary" :loading="saving">Save</Button>
            <Button variant="ghost" :disabled="saving" @click="cancelEditing">Cancel</Button>
          </div>
        </form>

        <div v-else-if="hasAboutInfo" class="space-y-3">
          <p v-if="profile?.bio" class="whitespace-pre-line text-gray-700">{{ profile.bio }}</p>
          <p v-if="profile?.instagramHandle" class="text-gray-600">
            📷
            <a
              :href="instagramProfileUrl(profile.instagramHandle)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
              >@{{ profile.instagramHandle }}</a
            >
          </p>
          <p v-if="profile?.homeCity" class="text-gray-600">📍 {{ profile.homeCity }}</p>
          <p v-if="profile?.hasDog" class="text-gray-600">
            🐶
            {{ profile.dogName || 'My dog'
            }}<span v-if="profile.dogBreed"> · {{ profile.dogBreed }}</span>
          </p>
          <div v-if="profile?.lookingFor?.length" class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-gray-500">Looking for:</span>
            <span
              v-for="item in profile.lookingFor"
              :key="item"
              class="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
            >
              {{ LOOKING_FOR_LABELS[item] }}
            </span>
          </div>
        </div>
        <p v-else class="text-gray-500">
          Nothing here yet. Tell others about yourself and your dog!
        </p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-lg bg-white p-6 text-center shadow-md">
          <div class="text-3xl font-bold text-blue-600">
            {{ userLocations.length }}
          </div>
          <p class="mt-1 text-gray-600">Locations Added</p>
        </div>
        <div class="rounded-lg bg-white p-6 text-center shadow-md">
          <div class="text-3xl font-bold text-green-600">
            {{ userReviews.length }}
          </div>
          <p class="mt-1 text-gray-600">Reviews Written</p>
        </div>
        <div class="rounded-lg bg-white p-6 text-center shadow-md">
          <div class="text-3xl font-bold text-purple-600">
            {{ favoriteLocations.length }}
          </div>
          <p class="mt-1 text-gray-600">Favorites</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="rounded-lg bg-white shadow-md">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="[
                'border-b-2 px-6 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900',
              ]"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- My Locations Tab -->
          <div v-if="activeTab === 'locations'">
            <div
              v-if="userLocations.length > 0"
              class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <LocationCard
                v-for="location in userLocations"
                :key="location.id"
                :location="location"
              />
            </div>
            <div v-else class="py-12 text-center text-gray-500">
              <svg
                class="mx-auto mb-3 h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p>You haven't added any locations yet</p>
              <NuxtLink to="/map" class="mt-4 inline-block">
                <Button variant="primary" size="sm">Add Your First Location</Button>
              </NuxtLink>
            </div>
          </div>

          <!-- Favorites Tab -->
          <div v-if="activeTab === 'favorites'">
            <div
              v-if="favoriteLocations.length > 0"
              class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <LocationCard
                v-for="location in favoriteLocations"
                :key="location.id"
                :location="location"
              />
            </div>
            <div v-else class="py-12 text-center text-gray-500">
              <svg
                class="mx-auto mb-3 h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <p>You haven't saved any favorites yet</p>
              <NuxtLink to="/map" class="mt-4 inline-block">
                <Button variant="primary" size="sm">Explore Locations</Button>
              </NuxtLink>
            </div>
          </div>

          <!-- Activity Tab -->
          <div v-if="activeTab === 'activity'">
            <div v-if="userReviews.length > 0" class="space-y-4">
              <div
                v-for="review in userReviews"
                :key="review.id"
                class="rounded-lg border border-gray-200 p-4"
              >
                <div class="mb-2 flex items-start justify-between">
                  <NuxtLink
                    :to="`/locations/${review.locationId}`"
                    class="font-medium text-blue-600 hover:underline"
                  >
                    View Location
                  </NuxtLink>
                  <span class="text-sm text-gray-500">
                    {{ formatRelativeTime(review.createdAt) }}
                  </span>
                </div>
                <Rating :model-value="review.rating" :readonly="true" size="sm" class="mb-2" />
                <p v-if="review.comment" class="text-gray-700">{{ review.comment }}</p>
              </div>
            </div>
            <div v-else class="py-12 text-center text-gray-500">
              <svg
                class="mx-auto mb-3 h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
              <p>You haven't written any reviews yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Location, LookingFor, Review } from '~/types'
import { LOOKING_FOR_LABELS, LOOKING_FOR_VALUES } from '~/types'
import { PROFILE_LIMITS, countCharacters, validateProfileUpdate } from '~/utils/profile'
import { formatRelativeTime } from '~/utils/formatters'
import Rating from '~/components/ui/Rating.vue'
import Button from '~/components/ui/Button.vue'
import Input from '~/components/ui/Input.vue'
import { useProfile } from '~/composables/useProfile'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'

const { isSignedIn, isLoaded } = useAuth()
const { user } = useUser()
const { ensureFavorites, favoriteLocations } = useFavorites()
const {
  profile,
  saving,
  photoSaving,
  fetchProfile,
  saveProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
} = useProfile()

const photoInput = ref<HTMLInputElement | null>(null)
const photoError = ref('')
const avatarSrc = computed(() =>
  getAvatarUrl(
    { profilePhotoUrl: profile.value?.profilePhotoUrl, avatarUrl: user.value?.imageUrl },
    200
  )
)

async function handlePhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  photoError.value = validateProfilePhotoFile(file) ?? ''
  if (photoError.value) return

  try {
    await uploadProfilePhoto(file)
  } catch {
    // useProfile already notified the user
  }
}

const loading = ref(true)
const activeTab = ref('locations')

const tabs = [
  { id: 'locations', label: 'My Locations' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'activity', label: 'Activity' },
]

const userLocations = ref<Location[]>([])
const userReviews = ref<Review[]>([])

// Load once Clerk has resolved auth (it may not be ready yet on a hard refresh)
watch(
  [isLoaded, isSignedIn],
  async ([loaded, signedIn]) => {
    if (!loaded) return
    if (signedIn) {
      loading.value = true
      await Promise.all([loadUserData(), ensureFavorites({ silent: true }).catch(() => {})])
    } else {
      userLocations.value = []
      userReviews.value = []
    }
    loading.value = false
  },
  { immediate: true }
)

async function loadUserData() {
  try {
    // Fetch stored profile, locations and reviews
    const data = await fetchProfile()
    userLocations.value = data.locations || []
    userReviews.value = data.reviews || []
  } catch (error) {
    console.error('Failed to load user data:', error)
  }
}

const editing = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({
  bio: '',
  instagramHandle: '',
  homeCity: '',
  hasDog: false,
  dogName: '',
  dogBreed: '',
  lookingFor: [] as LookingFor[],
})

const bioCount = computed(() => countCharacters(form.bio.trim()))
const hasAboutInfo = computed(() => {
  const p = profile.value
  return !!(p?.bio || p?.instagramHandle || p?.homeCity || p?.hasDog || p?.lookingFor?.length)
})

function startEditing() {
  const p = profile.value
  form.bio = p?.bio ?? ''
  form.instagramHandle = p?.instagramHandle ?? ''
  form.homeCity = p?.homeCity ?? ''
  form.hasDog = p?.hasDog ?? false
  form.dogName = p?.dogName ?? ''
  form.dogBreed = p?.dogBreed ?? ''
  form.lookingFor = [...(p?.lookingFor ?? [])]
  errors.value = {}
  editing.value = true
}

function cancelEditing() {
  editing.value = false
  errors.value = {}
}

function toggleLookingFor(option: LookingFor) {
  const index = form.lookingFor.indexOf(option)
  if (index === -1) {
    form.lookingFor.push(option)
  } else {
    form.lookingFor.splice(index, 1)
  }
}

async function handleSave() {
  const result = validateProfileUpdate({ ...form })
  errors.value = Object.fromEntries(result.errors.map((e) => [e.field, e.message]))
  if (!result.valid) return

  try {
    await saveProfile(result.data)
    editing.value = false
  } catch {
    // saveProfile already notified the user; stay in edit mode
  }
}

useHead({
  title: 'My Profile - Only Paws',
})
</script>
