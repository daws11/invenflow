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

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root directory to ensure relative paths work correctly
cd "$PROJECT_ROOT" || {
    echo "Failed to change to project root: $PROJECT_ROOT" >&2
    exit 1
}

# Configuration
LOG_FILE="$PROJECT_ROOT/logs/migrate-staging.log"
LOGS_DIR="$PROJECT_ROOT/logs"
MIGRATIONS_DIR="$PROJECT_ROOT/packages/backend/src/db/migrations"
BACKUP_DIR="/var/backups/invenflow-staging"
DRIZZLE_CONFIG="$PROJECT_ROOT/packages/backend/drizzle.config.ts"
ENV_STAGING="$PROJECT_ROOT/.env.staging"
PACKAGE_JSON="$PROJECT_ROOT/package.json"

# Create logs directory if it doesn't exist (MUST be before any log() calls)
mkdir -p "$LOGS_DIR" || {
    echo "Failed to create logs directory: $LOGS_DIR" >&2
    exit 1
}

# Ensure log file directory exists (double-check)
if [ ! -d "$(dirname "$LOG_FILE")" ]; then
    mkdir -p "$(dirname "$LOG_FILE")" || {
        echo "Failed to create log file directory: $(dirname "$LOG_FILE")" >&2
        exit 1
    }
fi

# Logging function with robust error handling
log() {
    local log_dir=$(dirname "$LOG_FILE")
    [ -d "$log_dir" ] || mkdir -p "$log_dir" 2>/dev/null || true
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE" 2>/dev/null || {
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    }
}

error() {
    local log_dir=$(dirname "$LOG_FILE")
    [ -d "$log_dir" ] || mkdir -p "$log_dir" 2>/dev/null || true
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

success() {
    local log_dir=$(dirname "$LOG_FILE")
    [ -d "$log_dir" ] || mkdir -p "$log_dir" 2>/dev/null || true
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    local log_dir=$(dirname "$LOG_FILE")
    [ -d "$log_dir" ] || mkdir -p "$log_dir" 2>/dev/null || true
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're rolling back migrations
if [ "$1" = "rollback" ]; then
    log "🔄 Rolling back last migration..."

    if [ ! -f "$DRIZZLE_CONFIG" ]; then
        error "Drizzle config not found at $DRIZZLE_CONFIG"
    fi

    cd "$PROJECT_ROOT/packages/backend" || error "Failed to change to backend directory"

    # Get the last migration file
    LAST_MIGRATION=$(ls -t "$MIGRATIONS_DIR"/*.sql 2>/dev/null | head -1)

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
    if [ -f "$ENV_STAGING" ]; then
        source "$ENV_STAGING"
    fi

    # Drop and recreate database (staging only!)
    psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" || error "Failed to reset database"

    # Run all migrations except the last one
    log "Running migrations except $MIGRATION_NAME..."

    # Find all migration files except the last one
    MIGRATION_FILES=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | grep -v "$LAST_MIGRATION" | sort)

    for migration in $MIGRATION_FILES; do
        log "Applying migration: $(basename $migration)"
        psql "$DATABASE_URL" -f "$migration" || error "Failed to apply $(basename $migration)"
    done

    cd "$PROJECT_ROOT" || error "Failed to return to project root"
    success "Rollback completed successfully"
    exit 0
fi

log "🗄️  Starting InvenFlow staging database migration..."

# Check if we're in the right directory
if [ ! -f "$PACKAGE_JSON" ]; then
    error "Cannot find package.json at $PACKAGE_JSON"
fi

# Check if Drizzle config exists
if [ ! -f "$DRIZZLE_CONFIG" ]; then
    error "Drizzle config not found at $DRIZZLE_CONFIG"
fi

# Load staging environment variables
if [ -f "$ENV_STAGING" ]; then
    log "Loading staging environment variables..."
    export $(cat "$ENV_STAGING" | grep -v '^#' | xargs)
else
    error "No .env.staging file found at $ENV_STAGING. Please create it first."
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
cd "$PROJECT_ROOT/packages/backend" || error "Failed to change to backend directory"

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

cd "$PROJECT_ROOT" || error "Failed to return to project root"

# Step 5: Verify migration success
log "✅ Step 5: Verifying migration success..."

# Check if all expected tables exist
cd "$PROJECT_ROOT/packages/backend" || error "Failed to change to backend directory"

REQUIRED_TABLES=("kanbans" "products" "users" "locations" "transfer_logs" "product_validations")

for table in "${REQUIRED_TABLES[@]}"; do
    if ! psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
        error "Table '$table' not found or not accessible after migration"
    fi
    log "✓ Table '$table' verified"
done

cd "$PROJECT_ROOT" || error "Failed to return to project root"

# Step 6: Migration summary
log "📋 Step 6: Migration summary..."

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
fi

# Count total migrations
MIGRATION_COUNT=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)
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