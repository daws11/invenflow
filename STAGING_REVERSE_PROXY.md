# Staging Reverse Proxy Setup - Quick Reference

## ✅ Konfigurasi Selesai

Server development sekarang dapat diakses menggunakan reverse proxy nginx dengan frontend URL `https://staging.ptunicorn.id`.

## Perubahan yang Dilakukan

### 1. CORS Middleware (`packages/backend/src/middleware/cors.ts`)
- ✅ Mendukung multiple origins (comma-separated)
- ✅ Mendukung staging domain dari environment variables
- ✅ Flexible untuk development dan staging mode
- ✅ Lebih permisif di development/staging untuk debugging

### 2. Environment Variables (`.env.staging`)
- ✅ `CORS_ORIGIN`: `https://staging.ptunicorn.id,http://localhost:3001,http://localhost:5173`
- ✅ `STAGING_DOMAIN`: `https://staging.ptunicorn.id`
- ✅ `FRONTEND_URL`: `https://staging.ptunicorn.id`

### 3. Server Configuration (`packages/backend/src/index.ts`)
- ✅ Explicitly listen di `0.0.0.0` (semua network interfaces)
- ✅ Enhanced logging untuk CORS configuration
- ✅ Menampilkan allowed origins saat startup

## Verifikasi

### CORS Headers Test
```bash
curl -H "Origin: https://staging.ptunicorn.id" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3001/api/health -v
```

**Expected Response:**
```
< Access-Control-Allow-Origin: https://staging.ptunicorn.id
< Access-Control-Allow-Credentials: true
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
< Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With
```

### Health Check
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok",...}
```

## Setup Nginx

Lihat file `NGINX_STAGING.md` untuk konfigurasi lengkap nginx.

**Quick Setup:**
1. Copy konfigurasi dari `NGINX_STAGING.md`
2. Update domain di konfigurasi jika berbeda
3. Setup SSL certificate (Let's Encrypt)
4. Enable dan reload nginx

## Testing dari Browser

Setelah nginx dikonfigurasi:

1. **Akses frontend**: `https://staging.ptunicorn.id`
2. **API calls** akan otomatis melalui nginx ke backend
3. **CORS** akan allow requests dari `https://staging.ptunicorn.id`

## Development Mode dengan Reverse Proxy

### Option 1: Development Mode (NODE_ENV=development)
- ✅ Server listen di `0.0.0.0:3001`
- ✅ CORS allow `localhost:*` dan `staging.ptunicorn.id`
- ✅ Lebih permisif untuk debugging

### Option 2: Production Mode (NODE_ENV=production)
- ✅ Server listen di `0.0.0.0:3001`
- ✅ CORS hanya allow origins dari `FRONTEND_URL` atau `CORS_ORIGIN`
- ✅ Lebih strict untuk security

## Environment Variables Reference

```env
# Required for reverse proxy
CORS_ORIGIN=https://staging.ptunicorn.id,http://localhost:3001,http://localhost:5173
STAGING_DOMAIN=https://staging.ptunicorn.id
FRONTEND_URL=https://staging.ptunicorn.id

# Backend
PORT=3001
NODE_ENV=production  # or development
```

## Troubleshooting

### CORS Error di Browser
1. Check environment variables sudah di-load:
   ```bash
   pm2 logs invenflow-staging | grep CORS
   ```

2. Restart dengan update env:
   ```bash
   pm2 restart invenflow-staging --update-env
   ```

3. Verify CORS headers:
   ```bash
   curl -H "Origin: https://staging.ptunicorn.id" \
        -X OPTIONS http://localhost:3001/api/health -v
   ```

### Server tidak bisa diakses dari luar
1. Check server listening:
   ```bash
   netstat -tlnp | grep 3001
   # Should show: 0.0.0.0:3001
   ```

2. Check firewall:
   ```bash
   sudo ufw status
   ```

3. Check nginx logs:
   ```bash
   sudo tail -f /var/log/nginx/invenflow-staging-error.log
   ```

## Security Notes

1. **Firewall**: Port 3001 tidak perlu di-expose ke public, hanya melalui nginx
2. **CORS**: Hanya allow origins yang diperlukan
3. **SSL**: Selalu gunakan HTTPS di staging/production
4. **Environment Variables**: Jangan commit `.env.staging` ke git

## Next Steps

1. ✅ Backend sudah dikonfigurasi untuk reverse proxy
2. ⏭️ Setup nginx menggunakan konfigurasi di `NGINX_STAGING.md`
3. ⏭️ Setup SSL certificate (Let's Encrypt)
4. ⏭️ Test akses dari browser
5. ⏭️ Update frontend `VITE_API_URL` jika perlu

