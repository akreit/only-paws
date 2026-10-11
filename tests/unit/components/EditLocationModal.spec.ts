import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import EditLocationModal from '~/components/location/EditLocationModal.vue'
import type { Location } from '~/types'

const updateLocation = vi.fn()

const location = {
  id: 'loc-1',
  type: 'PARK',
  leashRequired: null,
  offLeashArea: true,
  breedRestrictions: 'No bulldogs',
  amenities: JSON.stringify(['Patio']),
} as unknown as Location

// Render the slots inline so the teleported dialog can be queried
const ModalStub = {
  props: ['modelValue', 'title'],
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
}

function mountModal(open = true) {
  return mount(EditLocationModal, {
    props: { modelValue: open, location },
    global: { stubs: { Modal: ModalStub } },
  })
}

describe('EditLocationModal', () => {
  beforeEach(() => {
    updateLocation.mockReset()
    vi.stubGlobal('useLocations', () => ({ updateLocation }))
  })

  it('prefills the current type and features', () => {
    const wrapper = mountModal()

    expect(wrapper.find('select').element.value).toBe('PARK')
    expect((wrapper.find('#leashRequired').element as HTMLInputElement).checked).toBe(false)
    expect((wrapper.find('#offLeashArea').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('input[type="text"]').element.value).toBe('No bulldogs')
    expect((wrapper.find('[id="amenity-Patio"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('renders nothing while closed', () => {
    expect(mountModal(false).find('form').exists()).toBe(false)
  })

  it('submits only the changed fields and emits updated', async () => {
    const updated = { ...location, type: 'CAFE' }
    updateLocation.mockResolvedValue(updated)
    const wrapper = mountModal()

    await wrapper.find('select').setValue('CAFE')
    await wrapper.find('#leashRequired').setValue(true)
    await wrapper.find('input[type="text"]').setValue('  ')
    await wrapper.find('[id="amenity-Water bowls"]').setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(updateLocation).toHaveBeenCalledWith('loc-1', {
      type: 'CAFE',
      leashRequired: true,
      breedRestrictions: null,
      amenities: ['Patio', 'Water bowls'],
    })
    expect(wrapper.emitted('updated')?.[0]).toEqual([updated])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('does not call the API when nothing changed', async () => {
    const wrapper = mountModal()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(updateLocation).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('stays open when saving fails', async () => {
    updateLocation.mockRejectedValue(new Error('nope'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mountModal()

    await wrapper.find('#offLeashArea').setValue(false)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('updated')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('cancel closes without saving and reopening resets the draft', async () => {
    const wrapper = mountModal()

    await wrapper.find('select').setValue('BAR')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click')
    expect(updateLocation).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.find('select').element.value).toBe('PARK')
  })
})
