#!/bin/bash

# Script to start InvenFlow backend with PM2 in staging environment
# Usage: ./scripts/pm2-start-staging.sh

set -e

echo "🚀 Starting InvenFlow Staging with PM2..."

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
  echo "❌ Error: .env.staging file not found!"
  echo "📝 Please create .env.staging file in the root directory"
  exit 1
fi

# Ensure backend is built
if [ ! -d "packages/backend/dist" ]; then
  echo "📦 Building backend..."
  pnpm --filter backend build
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "❌ Error: PM2 is not installed!"
  echo "📦 Install PM2 with: npm install -g pm2"
  exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop existing instance if running
echo "🛑 Stopping existing PM2 instance (if any)..."
pm2 stop invenflow-staging 2>/dev/null || true
pm2 delete invenflow-staging 2>/dev/null || true

# Start with staging environment
echo "▶️  Starting PM2 with staging environment..."
pm2 start pm2/ecosystem.config.js --env staging

# Show status
echo ""
echo "✅ PM2 process started!"
echo ""
echo "📊 Status:"
pm2 status invenflow-staging

echo ""
echo "📝 Useful commands:"
echo "  pm2 logs invenflow-staging          # View logs"
echo "  pm2 stop invenflow-staging          # Stop the app"
echo "  pm2 restart invenflow-staging       # Restart the app"
echo "  pm2 delete invenflow-staging        # Remove from PM2"
echo "  pm2 monit                           # Monitor resources"
echo ""

