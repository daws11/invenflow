# InvenFlow - Inventory Management Kanban Application

A kanban-based inventory management system with two kanban types: Order and Receive.

## Features

- **Order Kanban**: New Request → In Review → Purchased
- **Receive Kanban**: Purchased → Received → Stored
- **Public Forms**: Each Order kanban generates a unique public URL
- **Kanban Linking**: Order kanbans can be linked to Receive kanbans for automatic product flow
- **Stock Tracking**: Automatic stock level tracking when products reach "Stored" status
- **Drag-and-Drop**: Intuitive kanban board interface

## Tech Stack

- **Monorepo**: PNPM workspaces
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **UI**: @dnd-kit for drag-and-drop, Zustand for state management

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PNPM >= 8.0.0
- PostgreSQL

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Database Setup

1. Create a PostgreSQL database:
   ```bash
   createdb invenflow
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your database configuration

4. Generate and run migrations:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

### Development

Start both frontend and backend servers:
```bash
pnpm dev
```

Or start individually:
```bash
# Backend only
pnpm --filter backend dev

# Frontend only
pnpm --filter frontend dev
```

## Project Structure

```
invenflow/
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── backend/      # Node.js + Express API
│   └── frontend/     # React application
└── README.md
```

## License

MIT