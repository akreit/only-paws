<template>
  <section
    id="meet-people"
    class="rounded-lg bg-white p-6 shadow-md"
    data-testid="meet-people-section"
  >
    <h2 class="mb-2 text-xl font-semibold text-gray-900">Meet people</h2>
    <p class="mb-4 text-sm text-gray-600">
      Opt in to let other signed-in dog lovers find you nearby. Only your username, avatar, bio,
      home city, dog and interests are shown, with an approximate distance. Your location is rounded
      to about 1 km before it is stored, and your exact location is never shown. You can turn this
      off at any time, which also deletes the stored location. You can change your location once
      every 6 hours.
    </p>

    <label class="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
      <input
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300"
        data-testid="discoverable-toggle"
        :checked="!!profile?.discoverable"
        :disabled="savingPeople"
        @change="toggleDiscoverable($event.target as HTMLInputElement)"
      />
      Let people nearby find me
    </label>

    <p class="mb-3 text-sm text-gray-700" data-testid="approx-status">
      <template v-if="profile?.hasApproxLocation">
        Approximate location set<span v-if="approxUpdatedLabel">
          · updated {{ approxUpdatedLabel }}</span
        >.
      </template>
      <template v-else>No approximate location set yet.</template>
    </p>

    <p
      v-if="!profile?.discoverable"
      class="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
      data-testid="opt-in-notice"
    >
      Meet people is off. Setting a location below turns it on, so people nearby can find you.
    </p>
    <div class="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        :loading="locating"
        data-testid="use-current-location"
        @click="useCurrentLocation"
      >
        {{ currentLocationLabel }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        :disabled="!profile?.homeCity || locating"
        data-testid="use-home-city"
        @click="useHomeCity"
      >
        {{ homeCityLabel }}
      </Button>
    </div>
    <p v-if="peopleError" class="mt-2 text-sm text-red-600">{{ peopleError }}</p>
  </section>
</template>

<script setup lang="ts">
const { profile } = useProfile()
const { saving: savingPeople, cooldownMessage, updatePeopleSettings } = usePeople()
const { geocodeAddress } = useMap()

const locating = ref(false)
const peopleError = ref('')

// Choosing a location while opted out also opts in, so the buttons say so explicitly
const currentLocationLabel = computed(() =>
  profile.value?.discoverable
    ? 'Use my current location'
    : 'Turn on Meet people and use my current location'
)
const homeCityLabel = computed(() =>
  profile.value?.discoverable ? 'Use my home city' : 'Turn on Meet people and use my home city'
)

const approxUpdatedLabel = computed(() => {
  const updatedAt = profile.value?.approxLocationUpdatedAt
  return updatedAt ? formatRelativeTime(new Date(updatedAt)) : ''
})

async function saveLocation(latitude: number, longitude: number) {
  try {
    // A location is only stored for people who opted in, so choosing one opts in as well
    await updatePeopleSettings(
      profile.value?.discoverable
        ? { latitude, longitude }
        : { discoverable: true, latitude, longitude }
    )
  } catch {
    // updatePeopleSettings already notified the user; keep the cooldown visible next to the buttons
    peopleError.value = cooldownMessage.value
  }
}

async function toggleDiscoverable(input: HTMLInputElement) {
  peopleError.value = ''
  const discoverable = input.checked
  try {
    await updatePeopleSettings({ discoverable })
  } catch {
    // Saving failed (e.g. no location yet): put the checkbox back to the stored value
    input.checked = !discoverable
    peopleError.value =
      cooldownMessage.value || (discoverable ? 'Choose a location below to turn this on.' : '')
  }
}

function useCurrentLocation() {
  peopleError.value = ''
  if (!navigator.geolocation) {
    peopleError.value = 'Your browser does not support location.'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      await saveLocation(coords.latitude, coords.longitude)
      locating.value = false
    },
    () => {
      peopleError.value = 'Could not get your location. Check your browser permissions.'
      locating.value = false
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
  )
}

async function useHomeCity() {
  peopleError.value = ''
  const city = profile.value?.homeCity
  if (!city) return
  locating.value = true
  try {
    const point = await geocodeAddress(city)
    if (!point) {
      peopleError.value = `Could not find "${city}" on the map.`
      return
    }
    await saveLocation(point.lat, point.lng)
  } catch {
    peopleError.value = 'Could not look up your home city. Try again later.'
  } finally {
    locating.value = false
  }
}
</script>
