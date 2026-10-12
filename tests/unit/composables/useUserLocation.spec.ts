import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '~/stores/map'
import { useNotificationsStore } from '~/stores/notifications'
import {
  getLastPosition,
  hasAskedForLocation,
  markAskedForLocation,
  saveLastPosition,
} from '~/utils/geolocation-preference'

const importLibraryMock = vi.hoisted(() => vi.fn())
const setOptionsMock = vi.hoisted(() => vi.fn())
vi.mock('@googlemaps/js-api-loader', () => ({
  importLibrary: importLibraryMock,
  setOptions: setOptionsMock,
}))

const geocode = vi.fn()

// Minimal Map: center is a value-comparable stand-in for LatLng
const fakeMaps = vi.hoisted(() => {
  type Center = {
    lat: () => number
    lng: () => number
    equals: (o?: Center) => boolean
  }
  const latLng = (lat: number, lng: number): Center => ({
    lat: () => lat,
    lng: () => lng,
    equals: (o) => !!o && o.lat() === lat && o.lng() === lng,
  })
  const state = {
    map: null as null | {
      center: Center | undefined
      zoom: number
      panTo: ReturnType<typeof vi.fn>
      setZoom: ReturnType<typeof vi.fn>
      options: { center: { lat: number; lng: number } }
    },
    // Simulates a map whose center is not yet defined at creation
    noStartCenter: false,
  }
  class FakeMap {
    center: Center | undefined = state.noStartCenter ? undefined : latLng(12.9716, 77.5946)
    zoom = 13
    panTo = vi.fn()
    setZoom = vi.fn()
    options: { center: { lat: number; lng: number } }
    constructor(_el: unknown, options: { center: { lat: number; lng: number } }) {
      this.options = options
      state.map = this
    }
    getCenter() {
      return this.center
    }
    getZoom() {
      return this.zoom
    }
    addListener = vi.fn()
  }
  return { FakeMap, latLng, state }
})

describe('useUserLocation', () => {
  // The loader state is module-level, so load a fresh copy per test. Mirrors map.vue's wiring.
  async function freshUseMap() {
    vi.resetModules()
    const map = (await import('~/composables/useMap')).useMap()
    const location = (await import('~/composables/useUserLocation')).useUserLocation()
    return {
      ...map,
      ...location,
      async initializeMap(element: HTMLElement) {
        const initialCenter = await location.resolveInitialCenter()
        const instance = await map.initializeMap(element, { initialCenter })
        location.trackInitialMap(instance)
        return instance
      },
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('useMapStore', useMapStore)
    vi.stubGlobal('useNotificationsStore', useNotificationsStore)
    localStorage.clear()
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { googleMapsApiKey: 'key' } }))
    vi.stubGlobal('google', undefined)
    importLibraryMock.mockReset().mockImplementation(async (name: string) => {
      if (name === 'maps') vi.stubGlobal('google', { maps: { Map: fakeMaps.FakeMap } })
      if (name === 'geocoding') {
        return {
          Geocoder: class {
            geocode = geocode
          },
        }
      }
      return {}
    })
    setOptionsMock.mockReset()
    geocode.mockReset()
  })
  describe('centerOnUserOnce', () => {
    const fix = { coords: { latitude: 1, longitude: 2 } }
    const position = { lat: 1, lng: 2 }
    let pending: ((p: typeof fix) => void) | null
    let getCurrentPosition: ReturnType<typeof vi.fn>

    // The fix is requested after an async permission check, so wait for the request first
    async function deliverFix(delivered: typeof fix = fix) {
      await vi.waitFor(() => expect(pending).not.toBeNull())
      pending!(delivered)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    // Resolve fixes immediately so tests can await centerOnUserOnce
    function autoFix() {
      getCurrentPosition.mockImplementation((success) => success(fix))
    }

    beforeEach(() => {
      pending = null
      getCurrentPosition = vi.fn((success) => {
        pending = success
      })
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
      fakeMaps.state.map = null
      fakeMaps.state.noStartCenter = false
    })

    it('requests one fix with the agreed options', async () => {
      const { centerOnUserOnce } = await freshUseMap()
      autoFix()
      await centerOnUserOnce({ isActive: () => true })

      expect(getCurrentPosition).toHaveBeenCalledTimes(1)
      expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      })
    })

    it('does nothing without navigator.geolocation', async () => {
      vi.stubGlobal('navigator', {})
      const { centerOnUserOnce } = await freshUseMap()

      expect(() => centerOnUserOnce({ isActive: () => true })).not.toThrow()
    })

    it('pans (store follows via center_changed) when the map has not moved or zoomed', async () => {
      const { centerOnUserOnce, initializeMap, mapStore } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      centerOnUserOnce({ isActive: () => true })

      await deliverFix()

      expect(fakeMaps.state.map!.panTo).toHaveBeenCalledWith(position)
      // No direct store write: the center_changed listener owns store sync
      expect(mapStore.center).toBeNull()
    })

    it('does not pan when only the zoom changed before the fix arrived', async () => {
      const { centerOnUserOnce, initializeMap } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      centerOnUserOnce({ isActive: () => true })
      // +/- zoom keeps the center
      fakeMaps.state.map!.zoom = 15

      await deliverFix()

      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
    })

    it('still pans when the start center was undefined and the zoom is unchanged', async () => {
      fakeMaps.state.noStartCenter = true
      const { centerOnUserOnce, initializeMap } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      centerOnUserOnce({ isActive: () => true })
      fakeMaps.state.map!.center = fakeMaps.latLng(12.9716, 77.5946)

      await deliverFix()

      expect(fakeMaps.state.map!.panTo).toHaveBeenCalledWith(position)
    })

    it('does not pan when the map center changed before the fix arrived', async () => {
      const { centerOnUserOnce, initializeMap, mapStore } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      centerOnUserOnce({ isActive: () => true })
      // e.g. a search pick panned the map
      fakeMaps.state.map!.center = fakeMaps.latLng(40, -70)
      const centerBefore = mapStore.center

      await deliverFix()

      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
      expect(mapStore.center).toEqual(centerBefore)
    })

    it('does nothing when the page is no longer active', async () => {
      let active = true
      const { centerOnUserOnce, initializeMap, mapStore } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      void centerOnUserOnce({ isActive: () => active })
      await vi.waitFor(() => expect(pending).not.toBeNull())
      active = false

      await deliverFix()

      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
      expect(mapStore.center).toBeNull()
    })

    it('only sets the store center when the fix arrives before the map exists', async () => {
      const { centerOnUserOnce, initializeMap, mapStore } = await freshUseMap()
      centerOnUserOnce({ isActive: () => true })

      await deliverFix()

      expect(fakeMaps.state.map).toBeNull()
      expect(mapStore.center).toEqual(position)

      await initializeMap(document.createElement('div'))
      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
    })

    it('ignores geolocation errors', async () => {
      getCurrentPosition.mockImplementation((_ok, fail) => fail({ code: 1 }))
      const { centerOnUserOnce } = await freshUseMap()

      await expect(centerOnUserOnce({ isActive: () => true })).resolves.toBeUndefined()
    })

    it('does not pan for a fix within 100 m of the start', async () => {
      const { centerOnUserOnce, initializeMap } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      void centerOnUserOnce({ isActive: () => true })

      // ~11 m north of the default center
      await deliverFix({ coords: { latitude: 12.9717, longitude: 77.5946 } })

      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
    })

    describe('permission states', () => {
      function stubPermission(state?: string | Error) {
        autoFix()
        const query = vi.fn(async () => {
          if (state instanceof Error) throw state
          return { state }
        })
        vi.stubGlobal('navigator', {
          geolocation: { getCurrentPosition },
          ...(state === undefined ? {} : { permissions: { query } }),
        })
        return query
      }

      it('locates silently when granted, without recording an ask', async () => {
        const query = stubPermission('granted')
        const { centerOnUserOnce } = await freshUseMap()

        await centerOnUserOnce({ isActive: () => true })

        expect(query).toHaveBeenCalledWith({ name: 'geolocation' })
        expect(getCurrentPosition).toHaveBeenCalledTimes(1)
        expect(hasAskedForLocation()).toBe(false)
      })

      it('also locates when granted after having asked before', async () => {
        stubPermission('granted')
        markAskedForLocation()
        const { centerOnUserOnce } = await freshUseMap()

        await centerOnUserOnce({ isActive: () => true })

        expect(getCurrentPosition).toHaveBeenCalledTimes(1)
      })

      it('never locates automatically when denied', async () => {
        stubPermission('denied')
        const { centerOnUserOnce } = await freshUseMap()

        await centerOnUserOnce({ isActive: () => true })

        expect(getCurrentPosition).not.toHaveBeenCalled()
      })

      it('forgets the stored position when denied', async () => {
        stubPermission('denied')
        saveLastPosition(position)
        const { centerOnUserOnce } = await freshUseMap()

        await centerOnUserOnce({ isActive: () => true })

        expect(getLastPosition()).toBeNull()
      })

      it('asks once on prompt and records it', async () => {
        stubPermission('prompt')
        const first = await freshUseMap()

        await first.centerOnUserOnce({ isActive: () => true })
        expect(getCurrentPosition).toHaveBeenCalledTimes(1)
        expect(hasAskedForLocation()).toBe(true)

        const second = await freshUseMap()
        await second.centerOnUserOnce({ isActive: () => true })
        expect(getCurrentPosition).toHaveBeenCalledTimes(1)
      })

      it.each([
        ['the Permissions API is missing', undefined],
        ['the Permissions API rejects', new Error('unsupported')],
      ])('falls back to ask-once when %s', async (_name, state) => {
        stubPermission(state)
        const first = await freshUseMap()

        await first.centerOnUserOnce({ isActive: () => true })
        await first.centerOnUserOnce({ isActive: () => true })

        expect(getCurrentPosition).toHaveBeenCalledTimes(1)
      })

      it('persists a successful fix as the last known position', async () => {
        stubPermission('granted')
        const { centerOnUserOnce } = await freshUseMap()

        await centerOnUserOnce({ isActive: () => true })

        expect(getLastPosition()).toMatchObject(position)
      })

      it('stores the position rounded to 3 decimals', async () => {
        stubPermission('granted')
        getCurrentPosition.mockImplementation((success) =>
          success({ coords: { latitude: 12.97164, longitude: 77.59466 } })
        )
        const { centerOnUserOnce } = await freshUseMap()

        await centerOnUserOnce({ isActive: () => true })

        expect(getLastPosition()).toMatchObject({ lat: 12.972, lng: 77.595 })
      })
    })

    describe('initial center from the last known position', () => {
      const stored = { lat: 40, lng: -70 }

      function stubPermission(state?: string) {
        vi.stubGlobal('navigator', {
          geolocation: { getCurrentPosition },
          ...(state ? { permissions: { query: async () => ({ state }) } } : {}),
        })
      }

      it.each(['granted', undefined])('starts the map there when permission is %s', async (s) => {
        stubPermission(s)
        saveLastPosition(stored)
        const { initializeMap } = await freshUseMap()

        await initializeMap(document.createElement('div'))

        expect(fakeMaps.state.map!.options.center).toEqual(stored)
      })

      it.each(['denied', 'prompt'])('ignores it when permission is %s', async (s) => {
        stubPermission(s)
        saveLastPosition(stored)
        const { initializeMap } = await freshUseMap()

        await initializeMap(document.createElement('div'))

        expect(fakeMaps.state.map!.options.center).toEqual({ lat: 12.9716, lng: 77.5946 })
      })

      it('forgets the stored position (but not the ask flag) when permission is denied', async () => {
        stubPermission('denied')
        markAskedForLocation()
        saveLastPosition(stored)
        const { resolveInitialCenter } = await freshUseMap()

        await expect(resolveInitialCenter()).resolves.toBeNull()

        expect(getLastPosition()).toBeNull()
        expect(hasAskedForLocation()).toBe(true)
      })

      it('skips the permission query when the store already has a center', async () => {
        const query = vi.fn(async () => ({ state: 'granted' }))
        vi.stubGlobal('navigator', { geolocation: { getCurrentPosition }, permissions: { query } })
        saveLastPosition(stored)
        const { resolveInitialCenter, mapStore } = await freshUseMap()
        mapStore.setCenter({ lat: 5, lng: 6 })

        await expect(resolveInitialCenter()).resolves.toBeNull()
        expect(query).not.toHaveBeenCalled()
      })

      it('prefers the store center and ignores a stale stored position', async () => {
        stubPermission('granted')
        saveLastPosition(stored)
        const first = await freshUseMap()
        first.mapStore.setCenter({ lat: 5, lng: 6 })
        await first.initializeMap(document.createElement('div'))
        expect(fakeMaps.state.map!.options.center).toEqual({ lat: 5, lng: 6 })

        localStorage.setItem(
          'only-paws:geolocation:v1',
          JSON.stringify({ asked: true, lastPosition: { ...stored, at: Date.now() - 25 * 36e5 } })
        )
        setActivePinia(createPinia())
        const second = await freshUseMap()
        await second.initializeMap(document.createElement('div'))
        expect(fakeMaps.state.map!.options.center).toEqual({ lat: 12.9716, lng: 77.5946 })
      })
    })
  })

  describe('locateMe', () => {
    const fix = { coords: { latitude: 1, longitude: 2 } }

    function stubGeolocation(
      impl: (ok: (p: typeof fix) => void, fail: (e: unknown) => void) => void
    ) {
      const getCurrentPosition = vi.fn(impl)
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
      return getCurrentPosition
    }

    it('pans and zooms to the user even if the map moved, saves it and clears loading', async () => {
      const getCurrentPosition = stubGeolocation((ok) => ok(fix))
      const { locateMe, locating, initializeMap } = await freshUseMap()
      await initializeMap(document.createElement('div'))
      fakeMaps.state.map!.center = fakeMaps.latLng(40, -70)
      fakeMaps.state.map!.zoom = 4

      const pendingLocate = locateMe()
      expect(locating.value).toBe(true)
      await pendingLocate

      expect(getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({ enableHighAccuracy: false, timeout: 8000 })
      )
      expect(fakeMaps.state.map!.panTo).toHaveBeenCalledWith({ lat: 1, lng: 2 })
      expect(fakeMaps.state.map!.setZoom).toHaveBeenCalledWith(15)
      expect(getLastPosition()).toMatchObject({ lat: 1, lng: 2 })
      expect(locating.value).toBe(false)
    })

    it('shows a settings hint when permission is denied', async () => {
      stubGeolocation((_ok, fail) => fail({ code: 1 }))
      saveLastPosition({ lat: 3, lng: 4 })
      const { locateMe, locating, initializeMap } = await freshUseMap()
      await initializeMap(document.createElement('div'))

      await locateMe()

      expect(getLastPosition()).toBeNull()

      const { notifications } = useNotificationsStore()
      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toMatchObject({
        type: 'error',
        message: expect.stringContaining('browser settings'),
      })
      expect(fakeMaps.state.map!.panTo).not.toHaveBeenCalled()
      expect(locating.value).toBe(false)
    })

    it('shows a generic message when the position is unavailable', async () => {
      stubGeolocation((_ok, fail) => fail({ code: 3 }))
      const { locateMe } = await freshUseMap()

      await locateMe()

      expect(useNotificationsStore().notifications[0]?.message).toContain("couldn't determine")
    })

    it('reports unsupported browsers instead of throwing', async () => {
      vi.stubGlobal('navigator', {})
      const { locateMe } = await freshUseMap()

      await expect(locateMe()).resolves.toBeUndefined()
      expect(useNotificationsStore().notifications).toHaveLength(1)
    })
  })
})
