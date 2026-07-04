variable "vercel_api_token" {
  description = "Vercel API token"
  sensitive   = true
}

variable "neon_api_key" {
  description = "Neon API key"
  sensitive   = true
}

variable "vercel_project_name" {
  description = "Name of the Vercel project (must match existing project name exactly)"
  type        = string
  default     = "only-paws"
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key"
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk secret key"
  sensitive   = true
}

variable "google_maps_api_key" {
  description = "Google Maps API key"
  sensitive   = true
}

variable "cloudinary_cloud_name" {
  description = "Cloudinary cloud name"
  type        = string
}

variable "cloudinary_api_key" {
  description = "Cloudinary API key"
  sensitive   = true
}

variable "cloudinary_api_secret" {
  description = "Cloudinary API secret"
  sensitive   = true
}

variable "cloudinary_upload_preset" {
  description = "Cloudinary upload preset"
  type        = string
}
