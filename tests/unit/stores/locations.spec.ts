import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLocationsStore } from '~/stores/locations'
import { useNotificationsStore } from '~/stores/notifications'

const loc = (id: string, name = id, type = 'PARK') =>
  ({ id, name, type, address: 'Main St', description: 'nice' }) as never

describe('locations store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('adds, updates and removes locations', () => {
    const store = useLocationsStore()
    store.addLocation(loc('1'))
    store.addLocation(loc('1', 'renamed'))
    expect(store.locations).toHaveLength(1)
    expect(store.locations[0].name).toBe('renamed')

    store.updateLocation(loc('1', 'updated'))
    store.updateLocation(loc('missing'))
    expect(store.locations[0].name).toBe('updated')

    store.removeLocation('missing')
    store.removeLocation('1')
    expect(store.locations).toHaveLength(0)
  })

  it('filters by type and search, and clears filters', () => {
    const store = useLocationsStore()
    store.setLocations([loc('1', 'Central', 'PARK'), loc('2', 'Cafe', 'CAFE')])
    store.setFilters({ type: 'PARK' as never })
    expect(store.filteredLocations).toHaveLength(1)
    store.setFilters({ search: 'cafe' })
    expect(store.filteredLocations).toHaveLength(0)
    store.clearFilters()
    expect(store.filteredLocations).toHaveLength(2)
  })

  it('tracks selection, loading and error', () => {
    const store = useLocationsStore()
    store.setSelectedLocation(loc('1'))
    store.setLoading(true)
    store.setError('x')
    expect(store.selectedLocation).toBeTruthy()
    expect(store.loading).toBe(true)
    expect(store.error).toBe('x')
  })
})

describe('notifications store', () => {
  it('adds typed notifications and removes them', () => {
    setActivePinia(createPinia())
    const store = useNotificationsStore()
    store.success('a')
    store.error('b')
    store.warning('c')
    store.info('d')
    expect(store.notifications.map((n) => n.type)).toEqual(['success', 'error', 'warning', 'info'])
    store.removeNotification(store.notifications[0].id)
    expect(store.notifications).toHaveLength(3)
  })
})
