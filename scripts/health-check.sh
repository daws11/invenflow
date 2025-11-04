#!/bin/bash

# InvenFlow Health Check Script
# Usage: ./scripts/health-check.sh [URL]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_URL="http://localhost:3001/api/health"
HEALTH_URL="${1:-$DEFAULT_URL}"
LOG_FILE="./logs/health-check.log"
TIMEOUT=30
MAX_RETRIES=3
RETRY_DELAY=5

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

# Health check function
check_health() {
    local url=$1
    local attempt=$2

    log "Health check attempt $attempt/$MAX_RETRIES: $url"

    # Perform health check with curl
    response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        success "Health check passed (HTTP 200)"

        # Parse and display health check response
        if echo "$body" | jq -e '.status' > /dev/null 2>&1; then
            echo -e "${BLUE}Health Response:${NC}"
            echo "$body" | jq . 2>/dev/null || echo "$body"
        else
            echo -e "${BLUE}Health Response:${NC} $body"
        fi

        return 0
    else
        warning "Health check failed (HTTP $http_code)"
        if [ -n "$body" ]; then
            echo -e "${YELLOW}Response:${NC} $body"
        fi
        return 1
    fi
}

# Function to check PM2 process status
check_pm2_status() {
    local app_name="invenflow-staging"

    if command -v pm2 &> /dev/null; then
        if pm2 describe "$app_name" > /dev/null 2>&1; then
            local status=$(pm2 jlist | jq -r ".[] | select(.name==\"$app_name\") | .pm2_env.status" 2>/dev/null)
            local uptime=$(pm2 jlist | jq -r ".[] | select(.name==\"$app_name\") | .pm2_env.pm_uptime" 2>/dev/null)
            local restarts=$(pm2 jlist | jq -r ".[] | select(.name==\"$app_name\") | .pm2_env.restart_time" 2>/dev/null)

            echo -e "${BLUE}PM2 Status:${NC}"
            echo -e "  Status: ${GREEN}$status${NC}"
            echo -e "  Uptime: $uptime seconds"
            echo -e "  Restarts: $restarts"

            if [ "$status" = "online" ]; then
                return 0
            else
                return 1
            fi
        else
            warning "PM2 process '$app_name' not found"
            return 1
        fi
    else
        warning "PM2 not installed or not in PATH"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    # Load environment variables
    if [ -f ".env.staging" ]; then
        source .env.staging
    fi

    if [ -n "$DATABASE_URL" ]; then
        log "Checking database connectivity..."

        if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            success "Database connection successful"
            return 0
        else
            error "Database connection failed"
            return 1
        fi
    else
        warning "DATABASE_URL not set, skipping database check"
        return 0
    fi
}

# Main execution
log "🏥 Starting InvenFlow health check..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Step 1: Check PM2 process status
log "📊 Step 1: Checking PM2 process status..."
if check_pm2_status; then
    success "PM2 process is healthy"
else
    error "PM2 process is not healthy"
fi

# Step 2: Check database connectivity
log "🗄️  Step 2: Checking database connectivity..."
check_database

# Step 3: HTTP health check with retries
log "🌐 Step 3: Performing HTTP health check..."

attempt=1
while [ $attempt -le $MAX_RETRIES ]; do
    if check_health "$HEALTH_URL" "$attempt"; then
        success "🎉 All health checks passed!"

        # Final summary
        echo -e "\n${BLUE}=== Health Check Summary ===${NC}"
        echo -e "PM2 Process: ${GREEN}✓${NC}"
        echo -e "Database:    ${GREEN}✓${NC}"
        echo -e "HTTP API:    ${GREEN}✓${NC} ($HEALTH_URL)"
        echo -e "Overall:     ${GREEN}HEALTHY${NC}"

        exit 0
    fi

    if [ $attempt -lt $MAX_RETRIES ]; then
        log "Retrying in $RETRY_DELAY seconds..."
        sleep $RETRY_DELAY
    fi

    attempt=$((attempt + 1))
done

# If we get here, all health checks failed
error "❌ Health checks failed after $MAX_RETRIES attempts"

# Additional debugging information
echo -e "\n${YELLOW}Debugging Information:${NC}"

# Check if port is listening
if command -v netstat &> /dev/null; then
    echo -e "${BLUE}Port 3001 status:${NC}"
    netstat -tlnp 2>/dev/null | grep :3001 || echo "Port 3001 is not listening"
fi

# Check recent PM2 logs
if command -v pm2 &> /dev/null; then
    echo -e "\n${BLUE}Recent PM2 logs:${NC}"
    pm2 logs invenflow-staging --lines 10 --nostream 2>/dev/null || echo "No PM2 logs available"
fi

exit 1