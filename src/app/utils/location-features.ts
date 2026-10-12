import type { Location } from '~/types'

export interface LocationFeature {
  key: 'leash' | 'offLeashArea' | 'breedRestrictions'
  label: string
  detail?: string
}

/** Dog-policy features of a location with shared wording (amenities are listed separately). */
export function locationFeatureLabels(
  location: Pick<Location, 'leashRequired' | 'offLeashArea' | 'breedRestrictions'>
): LocationFeature[] {
  const { leashRequired, offLeashArea, breedRestrictions } = location
  const features: LocationFeature[] = []

  if (typeof leashRequired === 'boolean') {
    features.push(
      leashRequired
        ? { key: 'leash', label: 'Leash required', detail: 'Dogs must be kept on leash' }
        : { key: 'leash', label: 'Leash optional', detail: 'Off-leash allowed' }
    )
  }
  if (offLeashArea) {
    features.push({
      key: 'offLeashArea',
      label: 'Off-leash area',
      detail: 'Designated area for dogs to run free',
    })
  }
  if (breedRestrictions) {
    features.push({
      key: 'breedRestrictions',
      label: 'Breed restrictions',
      detail: breedRestrictions,
    })
  }
  return features
}
