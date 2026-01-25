import type { Review } from './review'
import type { Photo } from './photo'

export enum LocationType {
  RESTAURANT = 'RESTAURANT',
  PARK = 'PARK',
  STORE = 'STORE',
  HOTEL = 'HOTEL',
  BEACH = 'BEACH',
  CAFE = 'CAFE',
  BAR = 'BAR',
  TRAINING_CENTER = 'TRAINING_CENTER',
  GROOMER = 'GROOMER',
  VETERINARIAN = 'VETERINARIAN',
  OTHER = 'OTHER',
}

export interface Location {
  id: string
  name: string
  type: LocationType
  description?: string
  address: string
  latitude: number
  longitude: number
  website?: string
  phone?: string
  hours?: string
  leashRequired?: boolean
  breedRestrictions?: string
  offLeashArea?: boolean
  amenities?: string
  createdById: string
  createdAt: Date
  updatedAt: Date
  reviews?: Review[]
  photos?: Photo[]
  _count?: {
    reviews: number
    photos: number
    favorites: number
  }
  averageRating?: number
}

export interface CreateLocationInput {
  name: string
  type: LocationType
  description?: string
  address: string
  latitude: number
  longitude: number
  website?: string
  phone?: string
  hours?: string
  leashRequired?: boolean
  breedRestrictions?: string
  offLeashArea?: boolean
  amenities?: string[]
}

export interface UpdateLocationInput extends Partial<CreateLocationInput> {
  id: string
}

export interface LocationFilters {
  type?: LocationType
  search?: string
  latitude?: number
  longitude?: number
  radiusKm?: number
}

