import type { LookingFor, PublicUser } from './user'

export interface PublicPerson extends PublicUser {
  /** Bucketed distance such as "~3 km"; never precise */
  distanceLabel: string
  lookingFor: LookingFor[]
}

export interface PeopleFilters {
  radius?: number
  breed?: string
  lookingFor?: string[]
  hasDog?: boolean
  page?: number
  pageSize?: number
}

export interface PeopleSearchResponse {
  people: PublicPerson[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface PeopleSettingsInput {
  discoverable?: boolean
  latitude?: number
  longitude?: number
}

export interface PeopleSettings {
  discoverable: boolean
  hasApproxLocation: boolean
  approxLocationUpdatedAt: string | null
}
