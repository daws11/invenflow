#!/bin/bash

# Quick Start Script for InvenFlow
# This script sets up PostgreSQL using Docker and runs the application

echo "🚀 Starting InvenFlow Setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker run --name invenflow-postgres \
    -e POSTGRES_DB=invenflow \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 \
    -d postgres:15

# Wait for database to start
echo "⏳ Waiting for database to start..."
sleep 10

# Test database connection
echo "🔍 Testing database connection..."
if psql -h localhost -U postgres -d invenflow -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Failed to connect to database"
    echo "   Please check your Docker setup or see DATABASE_SETUP.md"
    exit 1
fi

# Run database setup script
echo "🗄️ Running database setup..."
psql -h localhost -U postgres -d invenflow -f packages/backend/scripts/setup-db.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup complete!"
    echo ""
    echo "🎉 Setup complete! You can now start the application with:"
    echo "   pnpm dev"
    echo ""
    echo "📱 Access points:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:3001"
    echo "   Sample Public Form: http://localhost:5173/form/sample123"
else
    echo "❌ Database setup failed"
    echo "   Please see DATABASE_SETUP.md for troubleshooting"
fi