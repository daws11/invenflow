# InvenFlow Setup Guide

## Quick Start

1. **Install Dependencies** (already done):
   ```bash
   pnpm install
   ```

2. **Set up PostgreSQL Database**:

   **Option A: Using Docker (Easiest)**
   ```bash
   # Start PostgreSQL container
   docker run --name invenflow-postgres \
     -e POSTGRES_DB=invenflow \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     -d postgres:15

   # Wait 10 seconds for database to start
   sleep 10
   ```

   **Option B: Using Homebrew (macOS)**
   ```bash
   # Install and start PostgreSQL
   brew install postgresql
   brew services start postgresql

   # Create database
   createdb invenflow
   ```

   **Option C: Existing PostgreSQL**
   ```bash
   # Create database
   createdb invenflow
   ```

3. **Configure Database Connection**:
   ```bash
   # The database URL is already configured for Docker:
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invenflow

   # If using different credentials, edit packages/backend/.env
   ```

4. **Database Setup**:
   ```bash
   # Run the setup script to create tables and sample data
   psql -d invenflow -f packages/backend/scripts/setup-db.sql
   ```

5. **Start Development Servers**:
   ```bash
   # Start both frontend and backend
   pnpm dev

   # Or start individually:
   pnpm --filter backend dev  # Backend on http://localhost:3001
   pnpm --filter frontend dev # Frontend on http://localhost:5173
   ```

## Quick Test (Docker Users)

If you're using Docker, you can run everything with:

```bash
# One command to start PostgreSQL and run setup
docker run --name invenflow-postgres \
  -e POSTGRES_DB=invenflow \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:15 && \
sleep 10 && \
psql -h localhost -U postgres -d invenflow -f packages/backend/scripts/setup-db.sql && \
echo "Database setup complete! Now run: pnpm dev"
```

## Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **Database Studio**: `pnpm db:studio` (for viewing data)

## Project Structure

```
invenflow/
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── backend/      # Node.js + Express API
│   └── frontend/     # React application
└── README.md
```

## Development Commands

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio (database GUI)