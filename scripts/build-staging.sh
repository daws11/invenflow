#!/bin/bash

# InvenFlow Staging Build Script
# Usage: ./scripts/build-staging.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="./logs/build-staging.log"

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

log "🔨 Starting InvenFlow staging build process..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Please run this script from the project root directory"
fi

# Check if PNPM is installed
if ! command -v pnpm &> /dev/null; then
    error "PNPM is not installed. Please install PNPM first"
fi

# Load staging environment variables
if [ -f ".env.staging" ]; then
    log "Loading staging environment variables..."
    export $(cat .env.staging | grep -v '^#' | xargs)
else
    warning "No .env.staging file found, using default environment"
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
if [ -f "../../.env.staging" ]; then
    export VITE_API_URL="http://localhost:3001"
fi

pnpm build || error "Failed to build frontend"

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

BUILD_INFO_FILE="build-info.json"
cat > "$BUILD_INFO_FILE" << EOF
{
  "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "pnpmVersion": "$(pnpm --version)",
  "environment": "staging",
  "backendSize": "$(du -sh packages/backend/dist | cut -f1)",
  "frontendSize": "$(du -sh packages/frontend/dist | cut -f1)"
}
EOF

success "🎉 Build completed successfully!"
log "Backend built: packages/backend/dist/"
log "Frontend built: packages/frontend/dist/"
log "Shared built: packages/shared/dist/"
log "Build info saved to: $BUILD_INFO_FILE"

# Display build summary
echo -e "\n${BLUE}=== Build Summary ===${NC}"
echo -e "Backend:  ${GREEN}✓${NC} packages/backend/dist/"
echo -e "Frontend: ${GREEN}✓${NC} packages/frontend/dist/"
echo -e "Shared:   ${GREEN}✓${NC} packages/shared/dist/"
echo -e "Size:     Frontend $BUILD_SIZE"
echo -e "Info:     $BUILD_INFO_FILE"