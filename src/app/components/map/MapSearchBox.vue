<template>
  <div ref="root" class="relative w-full">
    <input
      :id="`${uid}-input`"
      :value="modelValue"
      type="text"
      role="combobox"
      autocomplete="off"
      placeholder="Search saved places or Google Maps..."
      aria-label="Search saved places or Google Maps"
      aria-autocomplete="list"
      :aria-expanded="panelOpen"
      :aria-controls="listboxId"
      :aria-activedescendant="activeOptionId"
      class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 placeholder-gray-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 sm:text-sm"
      @input="handleInput"
      @focus="handleFocus"
      @keydown="handleKeydown"
    />

    <div
      v-show="panelOpen"
      class="absolute inset-x-0 top-full z-20 mt-2 max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
      data-testid="map-search-panel"
    >
      <ul :id="listboxId" role="listbox" aria-label="Search results" class="py-1">
        <template v-for="group in model.groups" :key="group.id">
          <li
            role="presentation"
            class="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-gray-500"
          >
            {{ group.title }}
          </li>
          <li
            v-for="item in group.items"
            :id="optionId(item)"
            :key="item.key"
            role="option"
            :aria-selected="isActive(item)"
            :class="[
              'flex min-h-[48px] cursor-pointer items-center gap-3 px-3 py-2',
              isActive(item) ? 'bg-blue-50' : 'hover:bg-gray-50',
            ]"
            @mousemove="activeIndex = indexOf(item)"
            @click="choose(item)"
          >
            <span class="w-6 shrink-0 text-center text-lg" aria-hidden="true">
              {{ item.kind === 'saved' ? LOCATION_TYPE_ICONS[item.locationType] : '🔎' }}
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-gray-900">{{ item.label }}</span>
              <span v-if="item.description" class="block truncate text-xs text-gray-500">
                {{ item.description }}
              </span>
            </span>
          </li>
        </template>
      </ul>

      <p v-if="loading && !model.flat.length" class="px-3 py-3 text-sm text-gray-500" role="status">
        Searching...
      </p>
      <p v-else-if="!loading && !model.flat.length" class="px-3 py-3 text-sm text-gray-500">
        No places found
      </p>
      <p v-if="placesUnavailable && !loading" class="px-3 pb-2 pt-1 text-xs text-gray-400">
        Google place suggestions unavailable
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { LOCATION_TYPE_ICONS } from '~/utils/constants'
import {
  isSearchableQuery,
  moveActiveIndex,
  type SearchDropdownModel,
  type SearchResultItem,
} from '~/utils/map-search'

const props = defineProps<{
  modelValue: string
  model: SearchDropdownModel
  loading: boolean
  placesUnavailable: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [item: SearchResultItem]
  focus: []
}>()

const uid = useId()
const listboxId = `${uid}-listbox`
const root = ref<HTMLElement>()
const open = ref(false)
const activeIndex = ref(-1)

const panelOpen = computed(() => open.value && isSearchableQuery(props.modelValue))
const activeOptionId = computed(() => {
  const item = props.model.flat[activeIndex.value]
  return panelOpen.value && item ? optionId(item) : undefined
})

// New results invalidate the highlighted row
watch(
  () => props.model,
  () => {
    activeIndex.value = -1
  }
)

function optionId(item: SearchResultItem) {
  return `${uid}-opt-${item.key}`
}

function indexOf(item: SearchResultItem) {
  return props.model.flat.indexOf(item)
}

function isActive(item: SearchResultItem) {
  return indexOf(item) === activeIndex.value
}

function handleFocus() {
  open.value = true
  emit('focus')
}

function handleInput(event: Event) {
  open.value = true
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function close() {
  open.value = false
  activeIndex.value = -1
}

function choose(item: SearchResultItem) {
  close()
  emit('select', item)
}

function handleKeydown(event: KeyboardEvent) {
  const count = props.model.flat.length

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    open.value = true
    activeIndex.value = moveActiveIndex(
      activeIndex.value,
      event.key === 'ArrowDown' ? 1 : -1,
      count
    )
  } else if (event.key === 'Enter') {
    const item = props.model.flat[activeIndex.value]
    if (panelOpen.value && item) {
      event.preventDefault()
      choose(item)
    }
  } else if (event.key === 'Escape') {
    close()
  }
}

function handleOutsidePointer(event: Event) {
  if (root.value && !root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', handleOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointer))
</script>
