import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isProxy, isReactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '~/stores/map'

describe('map store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('holds the map instance raw, not as a reactive proxy', () => {
    const store = useMapStore()
    const map = { panTo: vi.fn() } as unknown as google.maps.Map

    store.setMapInstance(map)

    expect(store.mapInstance).toBe(map)
    expect(isProxy(store.mapInstance)).toBe(false)
    expect(isReactive(store.mapInstance)).toBe(false)
  })

  it('clears the instance and keeps panTo working', () => {
    const store = useMapStore()
    const panTo = vi.fn()
    store.setMapInstance({ panTo } as unknown as google.maps.Map)

    store.panTo(1, 2)
    expect(panTo).toHaveBeenCalledWith({ lat: 1, lng: 2 })
    expect(store.center).toEqual({ lat: 1, lng: 2 })

    store.setMapInstance(null)
    expect(store.mapInstance).toBeNull()
  })
})
