#!/bin/bash

# InvenFlow Staging Deployment Script
# Usage: ./scripts/deploy-staging.sh [rollback]

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
APP_NAME="invenflow-staging"
PROJECT_DIR="/var/www/invenflow-staging"
BACKUP_DIR="/var/backups/invenflow-staging"
LOG_FILE="$PROJECT_ROOT/logs/deploy-staging.log"
HEALTH_CHECK_URL="http://localhost:3001/api/health"
MAX_RETRIES=3
ROLLBACK_VERSION_FILE="$PROJECT_ROOT/logs/last_successful_version"

# Create logs directory if it doesn't exist (MUST be before any log() calls)
mkdir -p "$PROJECT_ROOT/logs" || {
    echo "Failed to create logs directory: $PROJECT_ROOT/logs" >&2
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

# Check if we're rolling back
if [ "$1" = "rollback" ]; then
    log "🔄 Starting rollback process..."

    if [ ! -f "$ROLLBACK_VERSION_FILE" ]; then
        error "No previous version found for rollback"
    fi

    PREVIOUS_VERSION=$(cat "$ROLLBACK_VERSION_FILE")
    log "Rolling back to version: $PREVIOUS_VERSION"

    cd "$PROJECT_DIR" || error "Cannot change to project directory"
    git checkout "$PREVIOUS_VERSION" || error "Failed to checkout previous version"

    log "Rebuilding previous version..."
    "$PROJECT_ROOT/scripts/build-staging.sh" || error "Build failed during rollback"

    log "Restarting PM2 with previous version..."
    pm2 reload ecosystem.config.cjs --env staging || error "PM2 reload failed"

    success "Rollback completed successfully"
    exit 0
fi

log "🚀 Starting InvenFlow staging deployment..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to perform health check
health_check() {
    local retries=0
    local max_retries=$1

    log "Performing health check..."

    while [ $retries -lt $max_retries ]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
            success "Health check passed"
            return 0
        fi

        retries=$((retries + 1))
        log "Health check attempt $retries/$max_retries failed. Retrying in 10 seconds..."
        sleep 10
    done

    error "Health check failed after $max_retries attempts"
}

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    error "PM2 is not installed. Please install PM2 first: npm install -g pm2"
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Please run this script from the project root directory"
fi

# Save current version for potential rollback
if command -v git &> /dev/null && [ -d ".git" ]; then
    CURRENT_VERSION=$(git rev-parse HEAD)
    echo "$CURRENT_VERSION" > "$ROLLBACK_VERSION_FILE"
    log "Current version saved: $CURRENT_VERSION"
fi

# Step 1: Clean installation
log "📦 Step 1: Cleaning and installing dependencies..."
rm -rf node_modules
pnpm install || error "Failed to install dependencies"

# Step 2: Build application
log "🔨 Step 2: Building application..."
"$PROJECT_ROOT/scripts/build-staging.sh" || error "Build failed"

# Step 3: Database backup (if needed)
log "💾 Step 3: Creating database backup..."
if [ -f ".env.staging" ]; then
    source .env.staging
    BACKUP_FILE="$BACKUP_DIR/invenflow_staging_$(date +%Y%m%d_%H%M%S).sql"

    if command -v pg_dump &> /dev/null; then
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE" || warning "Database backup failed, continuing..."
        log "Database backup created: $BACKUP_FILE"
    else
        warning "pg_dump not found, skipping database backup"
    fi
fi

# Step 4: Run database migrations
log "🗄️  Step 4: Running database migrations..."
"$PROJECT_ROOT/scripts/migrate-staging.sh" || error "Database migration failed"

# Step 5: Stop existing processes (if any)
log "🛑 Step 5: Stopping existing PM2 processes..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 stop "$APP_NAME" || warning "Failed to stop existing process"
fi

# Step 6: Start application
log "🚀 Step 6: Starting application with PM2..."
pm2 start "$PROJECT_ROOT/pm2/ecosystem.config.cjs" --env staging || error "Failed to start application"

# Step 7: Health check
log "🏥 Step 7: Performing health checks..."
sleep 5  # Give application time to start
health_check $MAX_RETRIES

# Step 8: Save PM2 configuration
log "💾 Step 8: Saving PM2 configuration..."
pm2 save || warning "Failed to save PM2 configuration"

# Setup PM2 startup script (if not already set up)
if ! pm2 startup | grep -q "already"; then
    log "Setting up PM2 startup script..."
    pm2 startup || warning "Failed to setup PM2 startup script"
fi

success "🎉 Deployment completed successfully!"
log "Application is running at: http://localhost:3001"
log "PM2 monitoring: pm2 monit"
log "View logs: pm2 logs $APP_NAME"

# Display PM2 status
pm2 status