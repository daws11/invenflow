#!/bin/bash

# Production Database Setup Script for InvenFlow
# This script sets up the PostgreSQL database for production environment

set -e

echo "🚀 Setting up InvenFlow Production Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="invenflow_production"
DB_USER="invenflow_prod"
DB_PASSWORD="SecureProdPass123!"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${YELLOW}Database Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"

# Check if PostgreSQL is running
echo -e "\n${YELLOW}Checking PostgreSQL service...${NC}"
if ! systemctl is-active --quiet postgresql; then
    echo -e "${RED}❌ PostgreSQL is not running. Please start it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Create database user if it doesn't exist
echo -e "\n${YELLOW}Creating database user...${NC}"
sudo -u postgres psql -c "DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
   END IF
END
\$\$;" || echo "User already exists or creation failed"

# Create database if it doesn't exist
echo -e "\n${YELLOW}Creating database...${NC}"
sudo -u postgres psql -c "SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\\gexec" || echo "Database already exists or creation failed"

# Grant privileges
echo -e "\n${YELLOW}Setting up privileges...${NC}"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || echo "Privileges already set"

# Update .env.production file
echo -e "\n${YELLOW}Updating .env.production file...${NC}"
DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" ../.env.production

# Copy to backend directory
cp ../.env.production ../packages/backend/.env

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
cd ../packages/backend
pnpm db:migrate

# Verify setup
echo -e "\n${YELLOW}Verifying database setup...${NC}"
TABLE_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

echo -e "${GREEN}✅ Database setup completed successfully!${NC}"
echo -e "${GREEN}✅ Created $TABLE_COUNT tables${NC}"
echo -e "\n${YELLOW}Database Connection String:${NC}"
echo "  $DB_URL"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Update the database password if needed"
echo "2. Configure SSL for production database connections"
echo "3. Set up regular backups"
echo "4. Configure database monitoring"
echo -e "\n${YELLOW}To test the connection:${NC}"
echo "  cd packages/backend && node dist/index.js"