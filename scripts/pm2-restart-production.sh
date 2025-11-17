#!/bin/bash

# Script to restart InvenFlow backend with PM2 in production environment
# Usage: ./scripts/pm2-restart-production.sh

set -e

echo "🔄 Restarting InvenFlow Production (Port 3002)..."

# Check if process exists
if pm2 describe invenflow-production &> /dev/null; then
  echo "▶️  Restarting existing process..."
  pm2 restart invenflow-production --update-env
else
  echo "▶️  Process not found, starting new instance..."
  ./scripts/pm2-start-production.sh
fi

echo "✅ Production restarted!"
pm2 status invenflow-production
