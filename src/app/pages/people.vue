<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="mb-2 text-3xl font-bold text-gray-900">🐕 Meet people</h1>

    <div v-if="!isLoaded" class="flex justify-center py-12">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>

    <div v-else-if="!isSignedIn" class="py-12 text-center">
      <p class="mx-auto mb-6 max-w-xl text-gray-600">
        Find dog owners and dog lovers near you for walks, playdates and tips. Only people who chose
        to be found show up, and only with an approximate distance.
      </p>
      <NuxtLink to="/sign-in">
        <Button variant="primary">Sign In</Button>
      </NuxtLink>
    </div>

    <template v-else>
      <p class="mb-6 text-gray-600">
        People nearby who opted in to be found. Distances are approximate.
      </p>

      <form class="mb-6 space-y-4 rounded-lg bg-white p-4 shadow-md" @submit.prevent="applyFilters">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            id="people-radius"
            v-model="filters.radius"
            label="Distance"
            :options="radiusOptions"
          />
          <Input
            id="people-breed"
            v-model="filters.breed"
            label="Dog breed"
            placeholder="e.g. Beagle"
          />
        </div>

        <fieldset>
          <legend class="mb-2 text-sm font-medium text-gray-700">Looking for</legend>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in LOOKING_FOR_VALUES"
              :key="option"
              type="button"
              :aria-pressed="filters.lookingFor.includes(option)"
              :class="[
                'rounded-full border px-3 py-1 text-sm transition-colors',
                filters.lookingFor.includes(option)
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400',
              ]"
              @click="toggleLookingFor(option)"
            >
              {{ LOOKING_FOR_LABELS[option] }}
            </button>
          </div>
        </fieldset>

        <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input v-model="filters.hasDog" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
          Has a dog
        </label>

        <Button type="submit" variant="primary" :loading="loading && page === 1">Search</Button>
      </form>

      <div
        v-if="needsLocation"
        class="rounded-lg bg-blue-50 p-6 text-center"
        data-testid="no-location"
      >
        <p class="mb-4 text-gray-700">Set your approximate location to find people nearby.</p>
        <NuxtLink to="/profile">
          <Button variant="primary">Go to my profile</Button>
        </NuxtLink>
      </div>

      <div v-else-if="loading && people.length === 0" class="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Looking for people nearby..." />
      </div>

      <div v-else-if="error" class="rounded-lg bg-red-50 p-6 text-center" data-testid="error">
        <p class="mb-4 text-red-700">{{ error }}</p>
        <Button variant="outline" @click="applyFilters">Try again</Button>
      </div>

      <div
        v-else-if="searched && people.length === 0"
        class="py-12 text-center text-gray-500"
        data-testid="empty"
      >
        <p>No one found within {{ filters.radius }} km. Try a larger distance or fewer filters.</p>
      </div>

      <div v-else-if="people.length > 0">
        <p class="mb-3 text-sm text-gray-500">{{ total }} found</p>
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <li
            v-for="person in people"
            :key="person.id"
            class="rounded-lg bg-white p-4 shadow-md"
            data-testid="person-card"
          >
            <div class="flex items-start gap-4">
              <img
                v-if="person.avatarUrl"
                :src="person.avatarUrl"
                :alt="person.username || 'User'"
                class="h-14 w-14 rounded-full border border-gray-200 object-cover"
              />
              <div
                v-else
                class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-2xl"
              >
                🐾
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-2">
                  <h2 class="truncate text-lg font-semibold text-gray-900">
                    {{ person.username || 'Anonymous' }}
                  </h2>
                  <span class="shrink-0 text-sm text-gray-500">{{ person.distanceLabel }}</span>
                </div>
                <p v-if="person.hasDog" class="text-sm text-gray-600">
                  🐶 {{ person.dogName || 'Dog'
                  }}<span v-if="person.dogBreed"> · {{ person.dogBreed }}</span>
                </p>
                <p v-if="person.homeCity" class="text-sm text-gray-600">📍 {{ person.homeCity }}</p>
              </div>
            </div>
            <p
              v-if="person.bio"
              class="mt-3 line-clamp-3 whitespace-pre-line text-sm text-gray-700"
            >
              {{ person.bio }}
            </p>
            <div v-if="person.lookingFor.length" class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="tag in person.lookingFor"
                :key="tag"
                class="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700"
              >
                {{ LOOKING_FOR_LABELS[tag] }}
              </span>
            </div>
          </li>
        </ul>

        <div v-if="hasMore" class="mt-6 text-center">
          <Button variant="outline" :loading="loading" @click="loadMore">Load more</Button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { LookingFor, PublicPerson } from '~/types'
import { LOOKING_FOR_LABELS, LOOKING_FOR_VALUES } from '~/types'
import Button from '~/components/ui/Button.vue'
import Input from '~/components/ui/Input.vue'
import Select from '~/components/ui/Select.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'

const { isSignedIn, isLoaded } = useAuth()
const { loading, error, needsLocation, searchPeople } = usePeople()

const radiusOptions = PEOPLE_RADII_KM.map((km) => ({ value: km, label: `${km} km` }))

const filters = reactive({
  radius: DEFAULT_PEOPLE_RADIUS_KM as number,
  breed: '',
  lookingFor: [] as LookingFor[],
  hasDog: false,
})

const people = ref<PublicPerson[]>([])
const page = ref(1)
const total = ref(0)
const hasMore = ref(false)
const searched = ref(false)

function toggleLookingFor(option: LookingFor) {
  const index = filters.lookingFor.indexOf(option)
  if (index === -1) filters.lookingFor.push(option)
  else filters.lookingFor.splice(index, 1)
}

async function runSearch(targetPage: number) {
  const result = await searchPeople({
    ...filters,
    radius: Number(filters.radius),
    page: targetPage,
  })
  if (!result) return
  people.value = targetPage === 1 ? result.people : [...people.value, ...result.people]
  page.value = result.page
  total.value = result.total
  hasMore.value = result.hasMore
  searched.value = true
}

async function applyFilters() {
  people.value = []
  searched.value = false
  await runSearch(1)
}

function loadMore() {
  return runSearch(page.value + 1)
}

// Search once Clerk has resolved auth (it may not be ready yet on a hard refresh)
watch(
  [isLoaded, isSignedIn],
  ([loaded, signedIn]) => {
    if (loaded && signedIn) applyFilters()
  },
  { immediate: true }
)

useHead({
  title: 'Meet people - Only Paws',
})
</script>
