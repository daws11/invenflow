# InvenFlow - Claude Development Guide

## Overview

InvenFlow is a kanban-based inventory management system built as a monorepo using PNPM workspaces. It manages two distinct kanban types: Order (for purchasing requests) and Receive (for inventory reception), with automatic product flow linking between them.

## Tech Stack

### Core Architecture
- **Monorepo**: PNPM workspaces with three main packages
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **State Management**: Zustand (frontend) + Zod (validation)
- **UI Framework**: Custom components with @dnd-kit for drag-and-drop

### Key Dependencies
- **Frontend**: React Router DOM, Axios, @dnd-kit family, Tailwind CSS
- **Backend**: Express, Drizzle ORM, Postgres driver, Zod validation, Nanoid
- **Shared**: Zod schemas for type-safe data validation

## Project Structure

```
invenflow/
├── packages/
│   ├── shared/          # Shared types and validation schemas
│   │   └── src/
│   │       └── types/
│   │           ├── kanban.ts     # Kanban-related types and Zod schemas
│   │           ├── product.ts    # Product-related types and schemas
│   │           └── transfer-log.ts # Transfer log types
│   │
│   ├── backend/         # Node.js + Express API server
│   │   └── src/
│   │       ├── index.ts          # Main Express server setup
│   │       ├── config/           # Configuration (environment variables)
│   │       ├── middleware/       # CORS and error handling middleware
│   │       ├── routes/           # API route handlers
│   │       └── db/               # Database setup and schemas
│   │           ├── schema/       # Drizzle ORM table definitions
│   │           └── migrations/   # Generated database migrations
│   │
│   └── frontend/        # React application
│       └── src/
│           ├── components/       # React components
│           ├── store/           # Zustand state management stores
│           ├── hooks/           # Custom React hooks
│           ├── utils/           # Utility functions (API client, etc.)
│           └── types/           # Frontend-specific types
├── scripts/             # Database setup scripts
├── .env.example        # Environment variables template
└── package.json        # Root workspace configuration
```

## Key Development Commands

### Root Level Commands
```bash
# Install all dependencies
pnpm install

# Start all development servers (frontend + backend)
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Format code with Prettier
pnpm format

# Database operations (executes in backend package)
pnpm db:generate    # Generate new database migrations
pnpm db:migrate     # Run database migrations
pnpm db:studio      # Open Drizzle Studio (database GUI)
```

### Backend-Specific Commands
```bash
cd packages/backend
pnpm dev              # Start development server with tsx watch
pnpm build            # Build TypeScript to dist/
pnpm start            # Run production build
pnpm clean            # Remove dist directory
```

### Frontend-Specific Commands
```bash
cd packages/frontend
pnpm dev              # Start Vite development server (port 5173)
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm lint             # Lint TypeScript and React files
```

## Database Architecture

### Core Tables
1. **kanbans**: Main kanban boards
   - `id` (UUID, primary key)
   - `name` (string, required)
   - `type` ('order' | 'receive')
   - `linkedKanbanId` (UUID, references another kanban)
   - `publicFormToken` (unique string for public URLs)
   - `createdAt`, `updatedAt` (timestamps)

2. **products**: Individual items in kanbans
   - `kanbanId` (UUID, foreign key to kanbans)
   - `columnStatus` (string, current kanban column)
   - `productDetails` (JSON with product information)
   - `stockLevel` (integer, when in 'Stored' status)
   - Enhanced fields: category, supplier, SKU, price, etc.

3. **transfer-logs**: Historical records of product movements

### Database Setup
```bash
# Create database
createdb invenflow

# Configure environment (copy from .env.example)
cp .env.example .env
# Update DATABASE_URL if needed

# Generate and run migrations
pnpm db:generate
pnpm db:migrate

# Alternative: Run setup script with sample data
psql -d invenflow -f packages/backend/scripts/setup-db.sql
```

### Database Access Points
- **Drizzle Studio**: `pnpm db:studio` (visual database interface)
- **Health Check**: `GET /api/health` (backend health endpoint)
- **Database URL**: Configured via `DATABASE_URL` environment variable

## Key Architecture Patterns

### 1. Monorepo Workspace Structure
- **Shared Package**: Contains Zod schemas and TypeScript types used by both frontend and backend
- **Backend Package**: Express API with Drizzle ORM for database operations
- **Frontend Package**: React SPA with Vite build system

### 2. Type Safety Pattern
- **Zod Schemas**: Used for request/response validation and type generation
- **Drizzle Types**: `$inferSelect` and `$inferInsert` for runtime type safety
- **Shared Types**: Exported from shared package and consumed by both packages

### 3. Kanban Workflow System
- **Order Kanban**: "New Request" → "In Review" → "Purchased"
- **Receive Kanban**: "Purchased" → "Received" → "Stored"
- **Linking**: Order kanbans can link to Receive kanbans for automatic product flow
- **Public Forms**: Each kanban generates a unique public URL for form submissions

### 4. State Management
- **Frontend**: Zustand stores for reactive state management
- **Backend**: Express middleware for request/response handling
- **Database**: Drizzle ORM with PostgreSQL for persistence

### 5. File Organization Patterns
- **Routes**: Organized by feature (kanbans, products, transfer-logs)
- **Components**: Functional React components with TypeScript
- **Middleware**: CORS and error handling middleware
- **Configuration**: Environment-based configuration

## Configuration Files

### Environment Variables (.env)
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/invenflow

# Backend Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration
VITE_API_URL=http://localhost:3001
```

### Key Configuration Files
- `packages/backend/drizzle.config.ts`: Drizzle ORM configuration
- `packages/frontend/vite.config.ts`: Vite build configuration with proxy to backend
- `pnpm-workspace.yaml`: PNPM workspace configuration
- `package.json` (root): Workspace scripts and dependencies

## Development Workflow

### 1. Setting Up Environment
```bash
# Install dependencies
pnpm install

# Set up database (choose one method):
# Option A: Docker (easiest)
./QUICK_START.sh

# Option B: Manual setup
createdb invenflow
psql -d invenflow -f packages/backend/scripts/setup-db.sql

# Start development servers
pnpm dev
```

### 2. Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **Database Studio**: `pnpm db:studio`

### 3. Adding New Features
1. **Database Changes**: Modify schema files, run `pnpm db:generate`
2. **Backend API**: Add routes, types, and validation in backend package
3. **Frontend**: Create components, stores, and update types
4. **Shared Types**: Add Zod schemas to shared package if needed

### 4. Testing APIs
- Use the health endpoint: `GET /api/health`
- Sample public form: `http://localhost:5173/form/sample123`
- Database studio for visual inspection: `pnpm db:studio`

## Important Conventions

### Code Style
- **TypeScript**: Strict typing throughout, using Zod for runtime validation
- **React**: Functional components with TypeScript
- **Database**: UUID primary keys, cascade deletes, proper indexing
- **API**: RESTful design with consistent error handling

### Naming Conventions
- **Database Tables**: Plural, snake_case (kanbans, products)
- **Database Columns**: snake_case with explicit foreign keys
- **React Components**: PascalCase (ProductCard, KanbanColumn)
- **Stores/Files**: camelCase (kanbanStore, apiUtils)
- **Environment Variables**: UPPER_CASE with underscores

### Error Handling
- **Backend**: Global error handler middleware with consistent error responses
- **Frontend**: Toast notifications for user feedback
- **Database**: Proper foreign key constraints and cascade deletes

### Security Considerations
- Environment variables for sensitive data
- CORS configuration for cross-origin requests
- Type-safe input validation with Zod
- Public form tokens for secure external access
