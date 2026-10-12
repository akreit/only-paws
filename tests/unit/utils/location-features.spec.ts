import { describe, expect, it } from 'vitest'
import { locationFeatureLabels } from '~/utils/location-features'

describe('locationFeatureLabels', () => {
  it('describes a required leash', () => {
    expect(locationFeatureLabels({ leashRequired: true })).toEqual([
      { key: 'leash', label: 'Leash required', detail: 'Dogs must be kept on leash' },
    ])
  })

  it('describes an optional leash (false is not "unknown")', () => {
    expect(locationFeatureLabels({ leashRequired: false })).toEqual([
      { key: 'leash', label: 'Leash optional', detail: 'Off-leash allowed' },
    ])
  })

  it('skips unknown leash policy', () => {
    expect(locationFeatureLabels({ leashRequired: undefined })).toEqual([])
    expect(locationFeatureLabels({ leashRequired: null as unknown as undefined })).toEqual([])
  })

  it('lists off-leash area and breed restrictions in order', () => {
    expect(
      locationFeatureLabels({
        leashRequired: true,
        offLeashArea: true,
        breedRestrictions: 'No pit bulls',
      }).map(({ key, label, detail }) => [key, label, detail])
    ).toEqual([
      ['leash', 'Leash required', 'Dogs must be kept on leash'],
      ['offLeashArea', 'Off-leash area', 'Designated area for dogs to run free'],
      ['breedRestrictions', 'Breed restrictions', 'No pit bulls'],
    ])
  })

  it('returns nothing when no features are set', () => {
    expect(locationFeatureLabels({})).toEqual([])
  })
})
