#!/bin/bash

# InvenFlow Staging Migration Script - Simple Version
# Usage: ./scripts/migrate-staging.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT" || exit 1

# Verify we're in the right place
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}" >&2
    exit 1
fi

echo -e "${BLUE}🗄️  Starting database migration...${NC}"

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo -e "${RED}Error: .env.staging file not found${NC}" >&2
    exit 1
fi

# Load environment variables
export $(cat .env.staging | grep -v '^#' | xargs)

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env.staging${NC}" >&2
    exit 1
fi

# Change to backend directory
cd "$PROJECT_ROOT/packages/backend" || {
    echo -e "${RED}Error: Cannot find backend directory${NC}" >&2
    exit 1
}

# Check database connection
echo -e "${BLUE}🔗 Checking database connection...${NC}"
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to database${NC}" >&2
    echo -e "${YELLOW}Please check DATABASE_URL and ensure PostgreSQL is running${NC}" >&2
    exit 1
fi

echo -e "${GREEN}✓ Database connection verified${NC}"

# Run migrations
echo -e "${BLUE}🚀 Running database migrations...${NC}"
pnpm db:migrate || {
    echo -e "${RED}Error: Database migration failed${NC}" >&2
    exit 1
}

echo -e "${GREEN}✅ Database migration completed successfully!${NC}"
