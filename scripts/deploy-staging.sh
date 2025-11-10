#!/bin/bash

# InvenFlow Staging Deployment Script - Simple Version
# Usage: ./scripts/deploy-staging.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get project root (where script is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT" || exit 1

# Verify we're in the right place
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}" >&2
    exit 1
fi

APP_NAME="invenflow-staging"

echo -e "${BLUE}🚀 Starting InvenFlow staging deployment...${NC}"
echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"

# Step 1: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install || {
    echo -e "${RED}Failed to install dependencies${NC}" >&2
    exit 1
}

# Step 2: Build application
echo -e "${BLUE}🔨 Building application...${NC}"
"$PROJECT_ROOT/scripts/build-staging.sh" || {
    echo -e "${RED}Build failed${NC}" >&2
    exit 1
}

# Step 3: Run database migrations
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
"$PROJECT_ROOT/scripts/migrate-staging.sh" || {
    echo -e "${RED}Database migration failed${NC}" >&2
    exit 1
}

# Step 4: Stop existing PM2 process (if any)
echo -e "${BLUE}🛑 Stopping existing PM2 process...${NC}"
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true
fi

# Step 5: Start application with PM2
echo -e "${BLUE}🚀 Starting application with PM2...${NC}"
cd "$PROJECT_ROOT" || exit 1
pm2 start pm2/ecosystem.config.cjs --env staging || {
    echo -e "${RED}Failed to start application${NC}" >&2
    exit 1
}

# Step 6: Save PM2 configuration
pm2 save 2>/dev/null || true

# Step 7: Show status
echo -e "\n${GREEN}✅ Deployment completed!${NC}"
echo -e "${BLUE}PM2 Status:${NC}"
pm2 status "$APP_NAME"

echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  pm2 logs $APP_NAME          # View logs"
echo -e "  pm2 restart $APP_NAME       # Restart app"
echo -e "  pm2 stop $APP_NAME         # Stop app"
