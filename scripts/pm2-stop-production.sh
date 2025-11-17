#!/bin/bash

# Script to stop InvenFlow backend with PM2 in production environment
# Usage: ./scripts/pm2-stop-production.sh

set -e

echo "🛑 Stopping InvenFlow Production (Port 3002)..."

pm2 stop invenflow-production || echo "⚠️  Process not running"

echo "✅ Production stopped!"
