#!/bin/bash

# InvenFlow Production Build Script - Port 3002
# Usage: ./scripts/build-production.sh

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
LOG_FILE="$PROJECT_ROOT/logs/build-production.log"
LOGS_DIR="$PROJECT_ROOT/logs"

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
    # Ensure log directory exists before writing
    [ -d "$log_dir" ] || mkdir -p "$log_dir" 2>/dev/null || true
    # Try to write to log file, fallback to stdout if it fails
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

log "🔨 Starting InvenFlow PRODUCTION build process (Port 3002)..."

# Verify we're in the project root
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    error "Cannot find package.json in project root: $PROJECT_ROOT"
fi

# Check if PNPM is installed
if ! command -v pnpm &> /dev/null; then
    error "PNPM is not installed. Please install PNPM first"
fi

# Load production environment variables
if [ -f ".env.production" ]; then
    log "Loading production environment variables..."
    export $(cat .env.production | grep -v '^#' | xargs)
else
    warning "No .env.production file found, using default environment"
fi

# Ensure production API URL is set correctly
if [ -z "$VITE_API_URL" ]; then
    export VITE_API_URL="https://inventory.ptunicorn.id"
    log "Setting default production API URL: $VITE_API_URL"
else
    log "Using API URL from environment: $VITE_API_URL"
fi

# Clean previous builds
log "🧹 Cleaning previous builds..."
rm -rf packages/backend/dist
rm -rf packages/frontend/dist
rm -rf packages/shared/dist

# Step 1: Build shared package first (dependencies)
log "📦 Step 1: Building shared package..."
cd packages/shared
pnpm build || error "Failed to build shared package"
cd ../..

# Step 2: Build backend
log "🔧 Step 2: Building backend..."
cd packages/backend
pnpm build || error "Failed to build backend"

# Verify backend build
if [ ! -f "dist/index.js" ]; then
    error "Backend build failed - dist/index.js not found"
fi
cd ../..

# Step 3: Build frontend
log "🎨 Step 3: Building frontend..."
cd packages/frontend

# Load frontend environment variables
if [ -f "../../.env.production" ]; then
    # Load production environment variables but don't override VITE_API_URL
    # The .env.production file should contain the correct production URL
    log "Loading production environment variables for frontend..."
    export $(cat ../../.env.production | grep -v '^#' | grep '^VITE_' | xargs)
else
    warning "No .env.production file found for frontend, using default VITE_API_URL"
    export VITE_API_URL="https://inventory.ptunicorn.id"
fi

# Build with explicit environment variables to ensure production URL is used
NODE_ENV=production VITE_API_URL="${VITE_API_URL:-https://inventory.ptunicorn.id}" pnpm build || error "Failed to build frontend"

# Verify frontend build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    error "Frontend build failed - dist directory or index.html not found"
fi

# Check build size
BUILD_SIZE=$(du -sh dist | cut -f1)
log "Frontend build size: $BUILD_SIZE"
cd ../..

# Step 4: Verify critical files
log "✅ Step 4: Verifying build artifacts..."

# Backend verification
if [ ! -f "packages/backend/dist/index.js" ]; then
    error "Backend build verification failed"
fi

# Frontend verification
if [ ! -f "packages/frontend/dist/index.html" ]; then
    error "Frontend build verification failed"
fi

# Shared package verification
if [ ! -d "packages/shared/dist" ]; then
    error "Shared package build verification failed"
fi

# Step 5: Generate build info
log "📋 Step 5: Generating build information..."

BUILD_INFO_FILE="build-info-production.json"
cat > "$BUILD_INFO_FILE" << EOF
{
  "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "pnpmVersion": "$(pnpm --version)",
  "environment": "production",
  "port": 3002,
  "backendSize": "$(du -sh packages/backend/dist | cut -f1)",
  "frontendSize": "$(du -sh packages/frontend/dist | cut -f1)"
}
EOF

success "🎉 Production build completed successfully!"
log "Backend built: packages/backend/dist/"
log "Frontend built: packages/frontend/dist/"
log "Shared built: packages/shared/dist/"
log "Build info saved to: $BUILD_INFO_FILE"

# Display build summary
echo -e "\n${BLUE}=== Production Build Summary ===${NC}"
echo -e "Backend:  ${GREEN}✓${NC} packages/backend/dist/"
echo -e "Frontend: ${GREEN}✓${NC} packages/frontend/dist/"
echo -e "Shared:   ${GREEN}✓${NC} packages/shared/dist/"
echo -e "Size:     Frontend $BUILD_SIZE"
echo -e "Port:     3002"
echo -e "Info:     $BUILD_INFO_FILE"
