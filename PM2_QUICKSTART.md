# PM2 Staging - Quick Start Guide

## ✅ Setup Sudah Selesai!

Aplikasi InvenFlow sudah dikonfigurasi untuk berjalan dengan PM2 di environment staging.

## 🚀 Quick Start

```bash
# 1. Start aplikasi
pnpm pm2:start

# 2. Check status
pnpm pm2:status

# 3. Monitor logs
pnpm pm2:logs

# 4. Test health check
curl http://localhost:3001/api/health
```

## 📋 Prerequisites Checklist

- ✅ PM2 installed (`npm install -g pm2`)
- ✅ `.env.staging` file exists di root directory
- ✅ Backend sudah di-build (`pnpm --filter backend build`)
- ✅ Database staging sudah setup

## 🔧 Configuration Files

- **PM2 Config**: `pm2/ecosystem.config.cjs` (menggunakan `.cjs` karena project menggunakan ES modules)
- **Environment**: `.env.staging` di root directory
- **Logs**: `./logs/invenflow-staging-*.log`

## 📝 Important Notes

1. **File Extension**: PM2 config menggunakan `.cjs` karena root `package.json` memiliki `"type": "module"`

2. **Environment Loading**: 
   - PM2 akan load `.env.staging` via `env_file` option
   - Backend juga akan load `.env.staging` secara eksplisit via dotenv

3. **Exec Mode**: Menggunakan `fork` mode (bukan `cluster`) untuk staging environment

## 🛠️ Common Commands

```bash
# Start
pnpm pm2:start
# atau
pm2 start pm2/ecosystem.config.cjs --env staging

# Stop
pnpm pm2:stop
# atau
pm2 stop invenflow-staging

# Restart
pnpm pm2:restart
# atau
pm2 restart invenflow-staging --update-env

# Logs
pnpm pm2:logs
# atau
pm2 logs invenflow-staging

# Status
pnpm pm2:status
# atau
pm2 status invenflow-staging

# Monitor
pm2 monit

# Delete (stop & remove)
pm2 delete invenflow-staging
```

## ✅ Verification

Setelah start, verifikasi dengan:

```bash
# 1. Check PM2 status
pm2 status invenflow-staging

# 2. Test health endpoint
curl http://localhost:3001/api/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...,"message":"Server is running"}

# 3. Check logs
pm2 logs invenflow-staging --lines 20
```

## 🐛 Troubleshooting

### Aplikasi tidak start

1. **Cek apakah backend sudah di-build:**
   ```bash
   ls packages/backend/dist/index.js
   ```

2. **Rebuild jika perlu:**
   ```bash
   pnpm --filter backend build
   ```

3. **Cek logs untuk error:**
   ```bash
   pm2 logs invenflow-staging --err
   ```

### Port sudah digunakan

```bash
# Cek proses yang menggunakan port 3001
lsof -i :3001

# Kill proses jika perlu
kill -9 <PID>
```

### Environment variables tidak ter-load

1. **Pastikan `.env.staging` ada di root directory**
2. **Restart dengan update env:**
   ```bash
   pm2 restart invenflow-staging --update-env
   ```

## 📚 More Information

Lihat `PM2_STAGING.md` untuk dokumentasi lengkap.

