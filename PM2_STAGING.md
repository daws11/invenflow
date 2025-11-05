# PM2 Staging Configuration Guide

Panduan untuk menjalankan aplikasi InvenFlow menggunakan PM2 di environment staging.

## Prerequisites

1. **PM2 harus terinstall secara global:**
   ```bash
   npm install -g pm2
   ```

2. **File `.env.staging` harus ada di root directory:**
   - File ini berisi konfigurasi environment untuk staging
   - Pastikan semua variabel yang diperlukan sudah diisi

3. **Backend harus sudah di-build:**
   ```bash
   pnpm build-staging
   # atau
   pnpm --filter backend build
   ```

## Cara Menggunakan

### 1. Start Aplikasi

```bash
# Menggunakan script helper
pnpm pm2:start

# Atau langsung dengan PM2
pm2 start pm2/ecosystem.config.js --env staging
```

### 2. Stop Aplikasi

```bash
# Menggunakan script helper
pnpm pm2:stop

# Atau langsung dengan PM2
pm2 stop invenflow-staging
```

### 3. Restart Aplikasi

```bash
# Menggunakan script helper
pnpm pm2:restart

# Atau langsung dengan PM2
pm2 restart invenflow-staging --update-env
```

### 4. Melihat Logs

```bash
# Menggunakan script helper
pnpm pm2:logs

# Atau langsung dengan PM2
pm2 logs invenflow-staging

# Logs real-time
pm2 logs invenflow-staging --lines 100

# Hanya error logs
pm2 logs invenflow-staging --err
```

### 5. Melihat Status

```bash
# Menggunakan script helper
pnpm pm2:status

# Atau langsung dengan PM2
pm2 status invenflow-staging
pm2 describe invenflow-staging
```

### 6. Monitor Resources

```bash
pm2 monit
```

## Konfigurasi

Konfigurasi PM2 berada di `pm2/ecosystem.config.js`. File ini sudah dikonfigurasi untuk:

- ✅ Load environment variables dari `.env.staging`
- ✅ Menggunakan `fork` mode (bukan cluster) untuk staging
- ✅ Auto-restart jika aplikasi crash
- ✅ Logging ke `./logs/` directory
- ✅ Memory limit: 1GB
- ✅ Graceful shutdown dengan timeout

### Environment Variables

PM2 akan:
1. Load variabel dari `.env.staging` via `env_file` option (PM2 5.0+)
2. Backend juga akan load `.env.staging` secara eksplisit melalui `dotenv`
3. Variabel di `env_staging` akan di-merge dengan nilai dari file

## Workflow Lengkap

```bash
# 1. Build aplikasi
pnpm build-staging

# 2. Run database migrations (jika perlu)
pnpm migrate-staging

# 3. Start dengan PM2
pnpm pm2:start

# 4. Check status
pnpm pm2:status

# 5. Monitor logs
pnpm pm2:logs
```

## Troubleshooting

### Aplikasi tidak start

1. **Cek apakah backend sudah di-build:**
   ```bash
   ls packages/backend/dist/index.js
   ```

2. **Cek apakah `.env.staging` ada:**
   ```bash
   ls .env.staging
   ```

3. **Cek logs untuk error:**
   ```bash
   pm2 logs invenflow-staging --err --lines 50
   ```

4. **Cek apakah port sudah digunakan:**
   ```bash
   lsof -i :3001
   ```

### Environment variables tidak ter-load

1. **Pastikan `.env.staging` ada di root directory**
2. **Cek apakah PM2 sudah di-restart setelah mengubah `.env.staging`:**
   ```bash
   pm2 restart invenflow-staging --update-env
   ```
3. **Cek logs backend untuk konfirmasi file yang di-load:**
   ```bash
   pm2 logs invenflow-staging | grep "Environment variables loaded"
   ```

### PM2 tidak terdeteksi

Install PM2 secara global:
```bash
npm install -g pm2
```

## File Logs

Logs disimpan di:
- `./logs/invenflow-staging-error.log` - Error logs
- `./logs/invenflow-staging-out.log` - Output logs
- `./logs/invenflow-staging-combined.log` - Combined logs

## Autostart pada Server Restart

Untuk membuat PM2 start otomatis saat server restart:

```bash
# Generate startup script
pm2 startup

# Save current PM2 process list
pm2 save
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm pm2:start` | Start aplikasi dengan PM2 |
| `pnpm pm2:stop` | Stop aplikasi |
| `pnpm pm2:restart` | Restart aplikasi |
| `pnpm pm2:logs` | Tampilkan logs |
| `pnpm pm2:status` | Tampilkan status |
| `pm2 monit` | Monitor resources real-time |
| `pm2 delete invenflow-staging` | Hapus dari PM2 (stop & remove) |

