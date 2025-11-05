#!/bin/bash

# Script to restart InvenFlow backend with PM2 in staging environment
# Usage: ./scripts/pm2-restart-staging.sh

set -e

echo "🔄 Restarting InvenFlow Staging..."

# Check if process exists
if pm2 describe invenflow-staging &> /dev/null; then
  echo "▶️  Restarting existing process..."
  pm2 restart invenflow-staging --update-env
else
  echo "▶️  Process not found, starting new instance..."
  ./scripts/pm2-start-staging.sh
fi

echo "✅ Restarted!"
pm2 status invenflow-staging

