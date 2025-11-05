#!/bin/bash

# Script to stop InvenFlow backend with PM2 in staging environment
# Usage: ./scripts/pm2-stop-staging.sh

set -e

echo "🛑 Stopping InvenFlow Staging..."

pm2 stop invenflow-staging || echo "⚠️  Process not running"

echo "✅ Stopped!"

