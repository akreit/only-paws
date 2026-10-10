import { LOOKING_FOR_VALUES } from '../types/user'
import type { LookingFor, ProfileUpdateInput } from '../types/user'

// Relative imports on purpose: this module is shared by the client and Nitro server code.

export const PROFILE_LIMITS = {
  bio: 500,
  homeCity: 100,
  dogName: 50,
  dogBreed: 100,
} as const

export interface ProfileFieldError {
  field: string
  message: string
}

export interface ProfileValidationResult {
  valid: boolean
  data: ProfileUpdateInput
  errors: ProfileFieldError[]
}

/** Length in Unicode code points, so emojis count as one character. */
export function countCharacters(value: string): number {
  return Array.from(value).length
}

const TEXT_FIELDS = ['bio', 'homeCity', 'dogName', 'dogBreed'] as const

export function validateProfileUpdate(input: unknown): ProfileValidationResult {
  const errors: ProfileFieldError[] = []
  const data: ProfileUpdateInput = {}

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, data, errors: [{ field: 'body', message: 'Body must be an object' }] }
  }
  const body = input as Record<string, unknown>

  for (const field of TEXT_FIELDS) {
    const value = body[field]
    if (value === undefined) continue
    if (value === null) {
      data[field] = null
      continue
    }
    if (typeof value !== 'string') {
      errors.push({ field, message: `${field} must be a string` })
      continue
    }
    const trimmed = value.trim()
    if (countCharacters(trimmed) > PROFILE_LIMITS[field]) {
      errors.push({
        field,
        message: `${field} must be at most ${PROFILE_LIMITS[field]} characters`,
      })
      continue
    }
    data[field] = trimmed === '' ? null : trimmed
  }

  if (body.hasDog !== undefined) {
    if (typeof body.hasDog === 'boolean') {
      data.hasDog = body.hasDog
    } else {
      errors.push({ field: 'hasDog', message: 'hasDog must be a boolean' })
    }
  }

  if (body.lookingFor !== undefined) {
    const value = body.lookingFor
    if (!Array.isArray(value)) {
      errors.push({ field: 'lookingFor', message: 'lookingFor must be an array' })
    } else if (value.some((item) => !(LOOKING_FOR_VALUES as readonly unknown[]).includes(item))) {
      errors.push({
        field: 'lookingFor',
        message: `lookingFor values must be one of: ${LOOKING_FOR_VALUES.join(', ')}`,
      })
    } else {
      data.lookingFor = [...new Set(value as LookingFor[])]
    }
  }

  // Dog details only make sense when the user has a dog
  if (data.hasDog === false) {
    data.dogName = null
    data.dogBreed = null
  }

  return { valid: errors.length === 0, data, errors }
}
