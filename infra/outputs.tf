output "neon_connection_uri" {
  description = "Neon database connection URI"
  value       = neon_project.only_paws.connection_uri
  sensitive   = true
}

output "vercel_project_id" {
  description = "Vercel project ID"
  value       = vercel_project.only_paws.id
}