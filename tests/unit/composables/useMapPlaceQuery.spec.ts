import { defineComponent, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocationQuery } from 'vue-router'
import type { Location } from '~/types'
import { useMapPlaceQuery } from '~/composables/useMapPlaceQuery'
import { createMockLocation } from '../../fixtures/factories'

const a = createMockLocation({ id: 'a', name: 'A' })
const b = createMockLocation({ id: 'b', name: 'B' })

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(
  query: LocationQuery = {},
  list: Location[] = [a, b],
  fetch?: (id: string) => Promise<Location>
) {
  const route = reactive<{ query: LocationQuery }>({ query })
  // Navigations apply to the reactive route, like vue-router would
  const router = {
    push: vi.fn(({ query: next }: { query: LocationQuery }) => {
      route.query = next
    }),
    replace: vi.fn(({ query: next }: { query: LocationQuery }) => {
      route.query = next
    }),
  }
  const locations = ref<Location[]>(list)
  const selectedSavedLocation = ref<Location | null>(null)
  const openLocation = vi.fn((location: Location) => {
    selectedSavedLocation.value = location
  })
  const closeLocation = vi.fn(() => {
    selectedSavedLocation.value = null
  })
  const focusLocation = vi.fn()
  const fetchLocation = vi.fn<(id: string) => Promise<Location>>(
    fetch ?? (() => Promise.reject(new Error('unexpected fetch')))
  )

  let api!: ReturnType<typeof useMapPlaceQuery>
  mount(
    defineComponent({
      setup() {
        api = useMapPlaceQuery({
          route,
          router,
          locations,
          selectedSavedLocation,
          openLocation,
          closeLocation,
          focusLocation,
          fetchLocation,
        })
        return () => null
      },
    })
  )

  return {
    api,
    route,
    router,
    locations,
    selectedSavedLocation,
    openLocation,
    closeLocation,
    focusLocation,
    fetchLocation,
  }
}

describe('useMapPlaceQuery', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pushes place on open, preserving other params, then opens without refocusing', async () => {
    const ctx = setup({ q: 'x' })

    ctx.api.open(a)
    expect(ctx.router.push).toHaveBeenCalledWith({ query: { q: 'x', place: 'a' } })
    await nextTick()

    expect(ctx.openLocation).toHaveBeenCalledWith(a)
    expect(ctx.focusLocation).not.toHaveBeenCalled()
    expect(ctx.fetchLocation).not.toHaveBeenCalled()
  })

  it('treats two quick local opens as local, never as deep links', async () => {
    const ctx = setup()
    // Navigations settle later than the clicks
    ctx.router.push.mockImplementation(() => undefined)

    ctx.api.open(a)
    ctx.api.open(b)
    ctx.route.query = { place: 'a' }
    await nextTick()
    ctx.route.query = { place: 'b' }
    await nextTick()

    expect(ctx.focusLocation).not.toHaveBeenCalled()
    expect(ctx.fetchLocation).not.toHaveBeenCalled()
    expect(ctx.selectedSavedLocation.value).toEqual(b)
  })

  it('does not push when the place is already in the URL and shown', async () => {
    const ctx = setup({ place: 'a' })
    await nextTick()
    ctx.router.push.mockClear()

    ctx.api.open(a)

    expect(ctx.router.push).not.toHaveBeenCalled()
    expect(ctx.openLocation).toHaveBeenCalledTimes(1)
  })

  it('replaces the query without place on clear, and only when present', async () => {
    const ctx = setup({ q: 'x' })
    ctx.api.clear()
    expect(ctx.router.replace).not.toHaveBeenCalled()

    ctx.api.open(a)
    await nextTick()
    ctx.api.clear()

    expect(ctx.router.replace).toHaveBeenCalledWith({ query: { q: 'x' } })
    await nextTick()
    expect(ctx.closeLocation).toHaveBeenCalled()
  })

  it('opens from the loaded list on mount and focuses the map', async () => {
    const ctx = setup({ place: 'b' })
    await nextTick()

    expect(ctx.openLocation).toHaveBeenCalledWith(b)
    expect(ctx.focusLocation).toHaveBeenCalledWith(b)
    expect(ctx.fetchLocation).not.toHaveBeenCalled()
  })

  it('falls back to the API when the place is not in the list', async () => {
    const remote = createMockLocation({ id: 'z' })
    const ctx = setup({ place: 'z' }, [], () => Promise.resolve(remote))
    await vi.waitFor(() => expect(ctx.openLocation).toHaveBeenCalledWith(remote))

    expect(ctx.fetchLocation).toHaveBeenCalledWith('z')
    expect(ctx.focusLocation).toHaveBeenCalledWith(remote)
  })

  it('drops place from the query when the fetch fails', async () => {
    const ctx = setup({ place: 'z', q: 'x' }, [], () => Promise.reject(new Error('404')))

    await vi.waitFor(() => expect(ctx.router.replace).toHaveBeenCalledWith({ query: { q: 'x' } }))
    expect(ctx.openLocation).not.toHaveBeenCalled()
  })

  it('ignores a stale fetch after the query changed', async () => {
    const slow = deferred<Location>()
    const ctx = setup({ place: 'z' }, [a], () => slow.promise)
    ctx.route.query = { place: 'a' }
    await nextTick()
    expect(ctx.openLocation).toHaveBeenCalledWith(a)
    ctx.openLocation.mockClear()

    slow.resolve(createMockLocation({ id: 'z' }))
    await slow.promise
    await nextTick()

    expect(ctx.openLocation).not.toHaveBeenCalled()
  })

  it('closes the stored panel when place disappears (Back)', async () => {
    const ctx = setup({ place: 'a' })
    await nextTick()
    expect(ctx.selectedSavedLocation.value).toEqual(a)

    ctx.route.query = {}
    await nextTick()

    expect(ctx.closeLocation).toHaveBeenCalledTimes(1)
    expect(ctx.selectedSavedLocation.value).toBeNull()
  })

  it('does not close anything when place is absent and no panel is open', async () => {
    const ctx = setup({ place: 'a' })
    await nextTick()
    ctx.selectedSavedLocation.value = null

    ctx.route.query = {}
    await nextTick()

    expect(ctx.closeLocation).not.toHaveBeenCalled()
  })

  it('openById pushes unknown ids for the watcher to fetch', async () => {
    const ctx = setup({}, [])
    const remote = createMockLocation({ id: 'z' })
    ctx.fetchLocation.mockResolvedValue(remote)

    ctx.api.openById('z')

    expect(ctx.router.push).toHaveBeenCalledWith({ query: { place: 'z' } })
    await vi.waitFor(() => expect(ctx.openLocation).toHaveBeenCalledWith(remote))
  })
})
