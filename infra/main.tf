# ---------------------------------------------------------------------------
# Database
#
# Provisioned via the Vercel Marketplace (Neon integration), not Terraform.
# The integration auto-injects DATABASE_URL into the project, so it is not
# managed here.
# ---------------------------------------------------------------------------

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

  # Pinned to the live project's current values so `apply` doesn't reset
  # them to provider defaults (import only adopts state, not desired config).
  git_repository = {
    type              = "github"
    repo              = "akreit/only-paws"
    production_branch = "main"
  }

  oidc_token_config = {
    enabled     = true
    issuer_mode = "team"
  }

  vercel_authentication = {
    # "all_except_custom_domains" (the live project's legacy value) was
    # renamed to "standard_protection" by Vercel; same behavior, new name.
    deployment_type = "standard_protection"
  }
}

# ---------------------------------------------------------------------------
# Environment variables in Vercel
# ---------------------------------------------------------------------------

locals {
  env_targets = ["production", "preview"]
}

# These three vars were created manually in the Vercel dashboard before this
# config existed — import blocks adopt them instead of creating duplicates.
import {
  to = vercel_project_environment_variable.clerk_publishable_key
  id = "${vercel_project.only_paws.id}/fkouPQETf4JlAIzy"
}

import {
  to = vercel_project_environment_variable.clerk_secret_key
  id = "${vercel_project.only_paws.id}/lrzXli6B3CW910ZM"
}

import {
  to = vercel_project_environment_variable.google_maps_api_key
  id = "${vercel_project.only_paws.id}/wqsTaIM8vsLF1L87"
}

resource "vercel_project_environment_variable" "clerk_publishable_key" {
  project_id = vercel_project.only_paws.id
  # Nuxt auto-maps runtime config from NUXT_PUBLIC_*/NUXT_* env vars at
  # runtime (no rebuild needed) — use that naming, not the bare CLERK_* names.
  key       = "NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  value     = var.clerk_publishable_key
  target    = local.env_targets
  sensitive = true
}

resource "vercel_project_environment_variable" "clerk_secret_key" {
  project_id = vercel_project.only_paws.id
  key        = "NUXT_CLERK_SECRET_KEY"
  value      = var.clerk_secret_key
  target     = local.env_targets
  sensitive  = true
}

resource "vercel_project_environment_variable" "google_maps_api_key" {
  project_id = vercel_project.only_paws.id
  key        = "GOOGLE_MAPS_API_KEY"
  value      = var.google_maps_api_key
  target     = local.env_targets
  sensitive  = true
}

# Cloudinary env vars intentionally omitted — no account set up yet.
# Tracked in https://github.com/akreit/only-paws/issues/30