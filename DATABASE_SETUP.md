# Database Setup Guide

## PostgreSQL Setup

### Option 1: Using Homebrew (macOS)

1. **Install PostgreSQL**:
   ```bash
   brew install postgresql
   brew services start postgresql
   ```

2. **Create Database**:
   ```bash
   createdb invenflow
   ```

3. **Verify Connection**:
   ```bash
   psql -d invenflow
   # You should see the postgres prompt: invenflow=#
   \q  # to quit
   ```

### Option 2: Using Docker

1. **Run PostgreSQL Container**:
   ```bash
   docker run --name invenflow-postgres \
     -e POSTGRES_DB=invenflow \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     -d postgres:15
   ```

2. **Wait for Database to Start** (about 10 seconds)

3. **Run Database Setup**:
   ```bash
   psql -h localhost -U postgres -d invenflow -f packages/backend/scripts/setup-db.sql
   ```

### Option 3: Using Existing PostgreSQL

1. **Update DATABASE_URL** in `packages/backend/.env` with your credentials:
   ```env
   DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/invenflow
   ```

2. **Create Database**:
   ```bash
   createdb invenflow -U YOUR_USERNAME
   ```

## Troubleshooting

### Error: "role does not exist"
This means the PostgreSQL user doesn't exist. Solutions:

**For Homebrew users**:
```bash
# Create a user matching your macOS username
createuser -s $(whoami)
# Then update .env to use your username
DATABASE_URL=postgresql://$(whoami)@localhost:5432/invenflow
```

**For Docker users**:
```bash
# Use the default docker credentials
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invenflow
```

### Error: "database does not exist"
```bash
# Create the database
createdb invenflow
```

### Error: "Connection refused"
Make sure PostgreSQL is running:
```bash
# For Homebrew
brew services start postgresql

# For Docker
docker start invenflow-postgres
```

## Setup Commands

Once your PostgreSQL is running, run these commands:

1. **Create Database** (if not exists):
   ```bash
   createdb invenflow
   ```

2. **Run Setup Script**:
   ```bash
   psql -d invenflow -f packages/backend/scripts/setup-db.sql
   ```

3. **Verify Setup**:
   ```bash
   psql -d invenflow -c "SELECT * FROM kanbans;"
   # Should show sample kanbans
   ```

## Common PostgreSQL Credentials

| Method | Username | Password |
|--------|----------|----------|
| Homebrew (default) | `$(whoami)` | (no password) |
| Docker (in this setup) | `postgres` | `postgres` |
| Postgres.app | `postgres` | (no password) |

## Testing Connection

Test your database connection with:
```bash
psql $DATABASE_URL -c "SELECT version();"
```

If this works, your application should connect successfully!