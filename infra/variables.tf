variable "vercel_api_token" {
  description = "Vercel API token"
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
