#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 1. Check prerequisites
command -v docker >/dev/null 2>&1 || error "Docker is not installed. Please install Docker first."
docker info >/dev/null 2>&1 || error "Docker daemon is not running. Please start Docker first."
command -v npx >/dev/null 2>&1 || error "npx is not available. Please install Node.js first."

# 2. Ensure DATABASE_URL is in .env
if [ ! -f .env ]; then
  error ".env file not found. Copy .env.example to .env and fill in the values."
fi

if ! grep -q "^DATABASE_URL=" .env; then
  info "Adding DATABASE_URL to .env..."
  echo 'DATABASE_URL=postgresql://onlypaws:onlypaws_dev@localhost:5432/onlypaws_development' >> .env
  info "DATABASE_URL added."
else
  info "DATABASE_URL already set in .env."
fi

# 3. Start the PostGIS database
info "Starting PostGIS database..."
docker compose up -d db 2>&1 | grep -v "^time=" || true

# 4. Wait for database to be healthy
info "Waiting for database to be healthy..."
RETRIES=30
until docker compose ps db --format json 2>/dev/null | grep -q '"healthy"'; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    error "Database did not become healthy in time."
  fi
  sleep 2
done
info "Database is healthy."

# 5. Install dependencies if needed
if [ ! -d node_modules ]; then
  info "Installing dependencies..."
  npm install
fi

# 6. Generate Prisma client and push schema
info "Generating Prisma client..."
npx prisma generate

info "Pushing database schema..."
npx prisma db push

# 7. Optionally seed the database
if [[ "${1:-}" == "--seed" ]]; then
  info "Seeding database..."
  npm run prisma:seed
  info "Seeding complete."
else
  warn "Skipping seed. Run with --seed to seed the database."
fi

info "Dev setup complete! Run 'npm run dev' to start the app."
