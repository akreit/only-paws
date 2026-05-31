# ---------------------------------------------------------------------------
# Neon database
# ---------------------------------------------------------------------------

resource "neon_project" "only_paws" {
  name      = "only-paws"
  region_id = "aws-us-east-1"
}

# ---------------------------------------------------------------------------
# Vercel project
#
# The project already exists — the import block below tells Terraform to take
# ownership of it rather than creating a new one. Run `terraform plan` first;
# Terraform will reconcile its config with the existing project.
# ---------------------------------------------------------------------------

import {
  to = vercel_project.only_paws
  id = var.vercel_project_name
}

resource "vercel_project" "only_paws" {
  name      = var.vercel_project_name
  framework = "nuxtjs"
}

# ---------------------------------------------------------------------------
# Environment variables in Vercel
# ---------------------------------------------------------------------------

locals {
  env_targets = ["production", "preview"]
}

resource "vercel_project_environment_variable" "database_url" {
  project_id = vercel_project.only_paws.id
  key        = "DATABASE_URL"
  value      = neon_project.only_paws.connection_uri
  target     = local.env_targets
}

resource "vercel_project_environment_variable" "clerk_publishable_key" {
  project_id = vercel_project.only_paws.id
  key        = "CLERK_PUBLISHABLE_KEY"
  value      = var.clerk_publishable_key
  target     = local.env_targets
}

resource "vercel_project_environment_variable" "clerk_secret_key" {
  project_id = vercel_project.only_paws.id
  key        = "CLERK_SECRET_KEY"
  value      = var.clerk_secret_key
  target     = local.env_targets
}

resource "vercel_project_environment_variable" "google_maps_api_key" {
  project_id = vercel_project.only_paws.id
  key        = "GOOGLE_MAPS_API_KEY"
  value      = var.google_maps_api_key
  target     = local.env_targets
}

resource "vercel_project_environment_variable" "cloudinary_cloud_name" {
  project_id = vercel_project.only_paws.id
  key        = "CLOUDINARY_CLOUD_NAME"
  value      = var.cloudinary_cloud_name
  target     = local.env_targets
}

resource "vercel_project_environment_variable" "cloudinary_api_key" {
  project_id = vercel_project.only_paws.id
  key        = "CLOUDINARY_API_KEY"
  value      = var.cloudinary_api_key
  target     = local.env_targets
}

resource "vercel_project_environment_variable" "cloudinary_api_secret" {
  project_id = vercel_project.only_paws.id
  key        = "CLOUDINARY_API_SECRET"
  value      = var.cloudinary_api_secret
  target     = local.env_targets
}

resource "vercel_project_environment_variable" "cloudinary_upload_preset" {
  project_id = vercel_project.only_paws.id
  key        = "CLOUDINARY_UPLOAD_PRESET"
  value      = var.cloudinary_upload_preset
  target     = local.env_targets
}