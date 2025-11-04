#!/bin/bash

# InvenFlow Staging Migration Script
# Usage: ./scripts/migrate-staging.sh [rollback]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="./logs/migrate-staging.log"
MIGRATIONS_DIR="packages/backend/src/db/migrations"
BACKUP_DIR="/var/backups/invenflow-staging"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if we're rolling back migrations
if [ "$1" = "rollback" ]; then
    log "🔄 Rolling back last migration..."

    if [ ! -f "packages/backend/drizzle.config.ts" ]; then
        error "Drizzle config not found"
    fi

    cd packages/backend

    # Get the last migration file
    LAST_MIGRATION=$(ls -t $MIGRATIONS_DIR/*.sql 2>/dev/null | head -1)

    if [ -z "$LAST_MIGRATION" ]; then
        error "No migration files found to rollback"
    fi

    MIGRATION_NAME=$(basename "$LAST_MIGRATION" .sql)
    log "Rolling back migration: $MIGRATION_NAME"

    # Create rollback SQL (reverse the last migration)
    # Note: Drizzle doesn't have automatic rollback, so we need to handle this manually
    # For now, we'll drop and recreate the schema (dangerous - only for staging!)
    warning "This will drop and recreate the staging database!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log "Rollback cancelled"
        exit 0
    fi

    # Load environment variables
    if [ -f "../../.env.staging" ]; then
        source ../../.env.staging
    fi

    # Drop and recreate database (staging only!)
    psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" || error "Failed to reset database"

    # Run all migrations except the last one
    log "Running migrations except $MIGRATION_NAME..."

    # Find all migration files except the last one
    MIGRATION_FILES=$(ls $MIGRATIONS_DIR/*.sql 2>/dev/null | grep -v "$LAST_MIGRATION" | sort)

    for migration in $MIGRATION_FILES; do
        log "Applying migration: $(basename $migration)"
        psql "$DATABASE_URL" -f "$migration" || error "Failed to apply $(basename $migration)"
    done

    cd ../..
    success "Rollback completed successfully"
    exit 0
fi

log "🗄️  Starting InvenFlow staging database migration..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Please run this script from the project root directory"
fi

# Check if Drizzle config exists
if [ ! -f "packages/backend/drizzle.config.ts" ]; then
    error "Drizzle config not found at packages/backend/drizzle.config.ts"
fi

# Load staging environment variables
if [ -f ".env.staging" ]; then
    log "Loading staging environment variables..."
    export $(cat .env.staging | grep -v '^#' | xargs)
else
    error "No .env.staging file found. Please create it first."
fi

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL not set in environment variables"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Create database backup
log "💾 Step 1: Creating database backup..."
BACKUP_FILE="$BACKUP_DIR/invenflow_staging_pre_migration_$(date +%Y%m%d_%H%M%S).sql"

if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE" || error "Failed to create database backup"
    success "Database backup created: $BACKUP_FILE"
else
    warning "pg_dump not found, skipping backup"
fi

# Step 2: Check database connection
log "🔗 Step 2: Checking database connection..."
cd packages/backend

if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    error "Cannot connect to database. Please check DATABASE_URL and ensure PostgreSQL is running."
fi

success "Database connection verified"

# Step 3: Check if there are pending migrations
log "🔍 Step 3: Checking for pending migrations..."

# Generate new migrations if needed
if pnpm db:generate | grep -q "No schema changes"; then
    log "No new migrations to apply"
else
    log "New migration files generated"
fi

# Step 4: Apply migrations
log "🚀 Step 4: Applying database migrations..."

# Run migrations using Drizzle
if pnpm db:migrate; then
    success "Database migrations applied successfully"
else
    error "Failed to apply database migrations"
fi

cd ../..

# Step 5: Verify migration success
log "✅ Step 5: Verifying migration success..."

# Check if all expected tables exist
cd packages/backend

REQUIRED_TABLES=("kanbans" "products" "users" "locations" "transfer_logs" "product_validations")

for table in "${REQUIRED_TABLES[@]}"; do
    if ! psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
        error "Table '$table' not found or not accessible after migration"
    fi
    log "✓ Table '$table' verified"
done

cd ../..

# Step 6: Migration summary
log "📋 Step 6: Migration summary..."

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
fi

# Count total migrations
MIGRATION_COUNT=$(ls $MIGRATIONS_DIR/*.sql 2>/dev/null | wc -l)
log "Total migrations: $MIGRATION_COUNT"

success "🎉 Database migration completed successfully!"
log "Database is ready for staging deployment"

# Display migration summary
echo -e "\n${BLUE}=== Migration Summary ===${NC}"
echo -e "Database: ${GREEN}✓${NC} $DATABASE_URL"
echo -e "Migrations: ${GREEN}✓${NC} $MIGRATION_COUNT files"
if [ -f "$BACKUP_FILE" ]; then
    echo -e "Backup: ${GREEN}✓${NC} $BACKUP_FILE"
fi