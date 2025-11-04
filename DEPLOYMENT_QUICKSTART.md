# InvenFlow Staging Deployment - Quick Start

## 🚀 One-Command Deployment

```bash
# Clone and setup
git clone <your-repo>
cd invenflow

# Setup database (one-time)
createdb invenflow_staging

# Configure environment
cp .env.example .env.staging
# Edit .env.staging with your database URL

# Full deployment
pnpm run deploy-staging
```

## 📋 Available Commands

### Deployment Commands
```bash
pnpm run deploy-staging     # Complete deployment (build + migrate + start)
pnpm run rollback-staging   # Rollback to previous version
pnpm run health-check       # Check application health
```

### Build Commands
```bash
pnpm run build-staging    # Build all packages
pnpm run migrate-staging  # Run database migrations
```

### PM2 Management
```bash
pm2 status                # Check process status
pm2 logs invenflow-staging  # View logs
pm2 reload invenflow-staging # Zero-downtime restart
pm2 monit                 # Monitoring dashboard
```

## 🔧 Environment Setup

Create `.env.staging`:
```env
DATABASE_URL=postgresql://yanuar@localhost:5432/invenflow_staging
NODE_ENV=production
PORT=3001
JWT_SECRET=your-staging-secret
```

## 🏥 Health Check

```bash
# Automated health check
pnpm run health-check

# Manual check
curl http://localhost:3001/api/health
```

## 📁 Access Points

- **Full App**: http://localhost:3001/
- **API**: http://localhost:3001/api/
- **Health**: http://localhost:3001/api/health
- **Uploads**: http://localhost:3001/uploads/

## 🔄 Development Workflow

```bash
# 1. Make changes
git add . && git commit -m "Your changes"

# 2. Deploy
pnpm run deploy-staging

# 3. Verify
pnpm run health-check
```

## ⚠️ Quick Troubleshooting

```bash
# If deployment fails
pm2 logs invenflow-staging

# If build fails
rm -rf node_modules && pnpm install && pnpm run build-staging

# If database issues
pnpm run migrate-staging

# Health check issues
curl -v http://localhost:3001/api/health
```

## 📚 More Information

- **Full Guide**: See `DEPLOYMENT_GUIDE.md`
- **Database Guide**: See `DATABASE_MIGRATION_GUIDE.md`
- **Project Structure**: See `CLAUDE.md`