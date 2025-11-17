#!/bin/bash

# Script to start InvenFlow backend with PM2 in production environment (Port 3002)
# Usage: ./scripts/pm2-start-production.sh

set -e

echo "🚀 Starting InvenFlow Production with PM2 (Port 3002)..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
  echo "❌ Error: .env.production file not found!"
  echo "📝 Please create .env.production file in the root directory"
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
echo "🛑 Stopping existing PM2 production instance (if any)..."
pm2 stop invenflow-production 2>/dev/null || true
pm2 delete invenflow-production 2>/dev/null || true

# Start with production environment
echo "▶️  Starting PM2 with production environment..."
pm2 start pm2/ecosystem.config.cjs --only invenflow-production --env production

# Show status
echo ""
echo "✅ Production PM2 process started!"
echo ""
echo "📊 Status:"
pm2 status invenflow-production

echo ""
echo "📝 Useful commands:"
echo "  pm2 logs invenflow-production       # View logs"
echo "  pm2 stop invenflow-production       # Stop the app"
echo "  pm2 restart invenflow-production    # Restart the app"
echo "  pm2 delete invenflow-production     # Remove from PM2"
echo "  pm2 monit                           # Monitor resources"
echo ""
echo "🌐 Production API will be available at: http://localhost:3002"
echo ""
