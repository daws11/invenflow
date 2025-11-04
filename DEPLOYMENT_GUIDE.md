# InvenFlow Staging Deployment Guide

## Overview

This guide covers deploying InvenFlow to a staging environment using PM2 process manager on a Linux VPS with self-hosted PostgreSQL database.

## 🏗️ Architecture

- **Backend**: Node.js + Express + TypeScript + Drizzle ORM
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Database**: PostgreSQL with automated migrations
- **Process Manager**: PM2 with clustering
- **Static Files**: Served by Express in production

## 📋 Prerequisites

### Server Requirements
- **OS**: Linux (Ubuntu 20.04+ or similar)
- **Node.js**: v18.0.0 or higher
- **PNPM**: v8.0.0 or higher
- **PostgreSQL**: v12 or higher
- **PM2**: Latest version (`npm install -g pm2`)
- **Git**: For version control

### Environment Setup
```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install PNPM
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install additional tools
sudo apt install git curl
```

## 🚀 Deployment Steps

### 1. Initial Server Setup

#### 1.1 Create Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Create staging database
CREATE DATABASE invenflow_staging;

# Create database user (optional, if not using default)
CREATE USER invenflow_staging WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE invenflow_staging TO invenflow_staging;

# Exit postgres
\q
```

#### 1.2 Create Project Directory
```bash
# Create application directory
sudo mkdir -p /var/www/invenflow-staging
sudo chown $USER:$USER /var/www/invenflow-staging

# Navigate to project directory
cd /var/www/invenflow-staging
```

#### 1.3 Clone Repository
```bash
# Clone your repository
git clone https://github.com/your-username/invenflow.git .

# Checkout desired branch
git checkout main  # or your staging branch
```

### 2. Environment Configuration

#### 2.1 Setup Environment File
```bash
# Copy and configure staging environment
cp .env.example .env.staging

# Edit the configuration
nano .env.staging
```

#### 2.2 Environment Variables
Configure `.env.staging` with your staging settings:
```env
# Database Configuration
DATABASE_URL=postgresql://yanuar@localhost:5432/invenflow_staging

# Backend Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=staging-invenflow-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Frontend Configuration
VITE_API_URL=http://localhost:3001

# Security Configuration
BCRYPT_ROUNDS=12
```

### 3. Build and Deploy

#### 3.1 Install Dependencies
```bash
# Install all dependencies
pnpm install
```

#### 3.2 Build Application
```bash
# Build for staging (builds shared → backend → frontend)
pnpm run build-staging
```

#### 3.3 Database Migration
```bash
# Run database migrations
pnpm run migrate-staging
```

#### 3.4 Deploy with PM2
```bash
# Full deployment (build + migrate + start)
pnpm run deploy-staging
```

## 🛠️ Available Scripts

### Build Scripts
```bash
pnpm run build-staging    # Build all packages for staging
pnpm run migrate-staging  # Run database migrations
```

### Deployment Scripts
```bash
pnpm run deploy-staging     # Full deployment workflow
pnpm run rollback-staging   # Rollback to previous version
pnpm run health-check       # Application health monitoring
```

### Database Scripts
```bash
pnpm run migrate-rollback   # Rollback last migration
pnpm run db:generate        # Generate new migrations
pnpm run db:migrate         # Apply migrations
pnpm run db:studio          # Open Drizzle Studio
```

## 📊 PM2 Management

### Process Management
```bash
# Start application
pm2 start pm2/ecosystem.config.js --env staging

# Restart application (zero-downtime)
pm2 reload invenflow-staging

# Stop application
pm2 stop invenflow-staging

# Delete application
pm2 delete invenflow-staging

# View logs
pm2 logs invenflow-staging

# Monitor processes
pm2 monit

# Save current configuration
pm2 save

# Generate startup script
pm2 startup
```

### Process Status
```bash
# List all processes
pm2 status

# Get detailed information
pm2 describe invenflow-staging

# View resource usage
pm2 show invenflow-staging
```

## 🔍 Health Monitoring

### Health Check Endpoint
```bash
# Automated health check
pnpm run health-check

# Manual health check
curl http://localhost:3001/api/health
```

### Health Check Components
- ✅ **PM2 Process Status**: Checks if process is running
- ✅ **Database Connectivity**: Verifies database connection
- ✅ **HTTP API**: Tests API endpoint availability
- ✅ **Response Analysis**: Validates health check response

### Monitoring Logs
```bash
# Application logs
tail -f logs/invenflow-staging-out.log

# Error logs
tail -f logs/invenflow-staging-error.log

# Combined logs
tail -f logs/invenflow-staging-combined.log

# PM2 logs
pm2 logs invenflow-staging --lines 100
```

## 🔄 Deployment Workflow

### Normal Deployment
```bash
# 1. Pull latest changes
git pull origin main

# 2. Full deployment (recommended)
pnpm run deploy-staging
```

### Manual Deployment Steps
```bash
# 1. Clean install dependencies
rm -rf node_modules
pnpm install

# 2. Build application
pnpm run build-staging

# 3. Database migrations
pnpm run migrate-staging

# 4. Restart application
pm2 reload ecosystem.config.js --env staging

# 5. Health check
pnpm run health-check
```

### Rollback Procedure
```bash
# Quick rollback to previous version
pnpm run rollback-staging

# Manual rollback
git checkout <previous-commit-hash>
pnpm run build-staging
pm2 reload ecosystem.config.js --env staging
```

## 📁 File Structure

```
invenflow/
├── pm2/
│   └── ecosystem.config.js      # PM2 configuration
├── scripts/
│   ├── deploy-staging.sh         # Main deployment script
│   ├── build-staging.sh          # Build automation
│   ├── migrate-staging.sh        # Database migrations
│   └── health-check.sh           # Health monitoring
├── logs/                         # Application logs
├── packages/
│   ├── backend/dist/             # Compiled backend
│   ├── frontend/dist/            # Built frontend
│   └── shared/dist/              # Shared package builds
├── uploads/                      # File upload directory
├── .env.staging                  # Staging environment variables
└── build-info.json               # Build information
```

## 🔒 Security Considerations

### Environment Security
- Use strong, unique JWT secrets
- Secure database credentials
- Enable HTTPS in production
- Regular security updates

### Application Security
- CORS properly configured
- Rate limiting enabled
- Input validation active
- File upload restrictions

### Server Security
```bash
# Configure firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# Secure file permissions
chmod 600 .env.staging
chmod +x scripts/*.sh
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs invenflow-staging

# Verify build exists
ls -la packages/backend/dist/index.js

# Check environment variables
pm2 describe invenflow-staging
```

#### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check database exists
psql -l | grep invenflow_staging

# Run migrations manually
cd packages/backend && pnpm db:migrate
```

#### Build Failures
```bash
# Clean build
rm -rf node_modules packages/*/dist
pnpm install
pnpm run build-staging

# Check TypeScript errors
pnpm run lint
```

#### Health Check Failures
```bash
# Manual health check
curl -v http://localhost:3001/api/health

# Check if port is listening
netstat -tlnp | grep :3001

# Verify all components
pnpm run health-check
```

### Performance Issues
```bash
# Monitor resource usage
pm2 monit

# Check memory usage
pm2 show invenflow-staging

# Restart if needed
pm2 restart invenflow-staging
```

## 📈 Production Optimization

### Performance Tuning
```javascript
// In pm2/ecosystem.config.js
{
  instances: 'max',           // Use all CPU cores
  max_memory_restart: '1G',   # Restart if memory exceeds 1GB
  node_args: '--max-old-space-size=1024'
}
```

### Caching Strategy
- Static assets cached for 1 year
- HTML files not cached
- API responses cached appropriately
- Database query optimization

### Monitoring Setup
- PM2 monitoring dashboard
- Log rotation configured
- Health check endpoints ready
- Error tracking integration ready

## 🎯 Next Steps

### Production Deployment
1. **Domain Setup**: Configure DNS and SSL certificates
2. **Load Balancer**: Consider Nginx or similar
3. **Monitoring**: Set up comprehensive monitoring
4. **Backup Strategy**: Regular database and file backups
5. **CI/CD**: Automate deployment pipeline

### Automation Opportunities
- GitHub Actions integration
- Automated testing pipeline
- Blue-green deployment
- Database backup automation
- Security scanning

---

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Test individual components

Remember: This is a staging environment, so it's okay to experiment and debug issues here before moving to production!