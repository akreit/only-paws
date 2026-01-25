export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

export function validateRating(rating: number): boolean {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating)
}

export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function validateRequiredString(value: string | undefined, minLength = 1): boolean {
  return !!value && value.trim().length >= minLength
}

export function validateStringLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength
}

export interface ValidationError {
  field: string
  message: string
}

export function createValidationError(field: string, message: string): ValidationError {
  return { field, message }
}

