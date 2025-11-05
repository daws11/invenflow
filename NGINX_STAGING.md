# Nginx Reverse Proxy Configuration untuk Staging

Konfigurasi nginx untuk reverse proxy ke InvenFlow backend di staging environment.

## Prerequisites

- Nginx terinstall di server
- Domain `staging.ptunicorn.id` sudah di-point ke server IP
- SSL certificate sudah di-setup (Let's Encrypt recommended)
- Backend berjalan di `localhost:3001`

## Konfigurasi Nginx

### 1. Buat file konfigurasi nginx

Buat file `/etc/nginx/sites-available/invenflow-staging`:

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name staging.ptunicorn.id;

    # Redirect all HTTP requests to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name staging.ptunicorn.id;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/staging.ptunicorn.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.ptunicorn.id/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/invenflow-staging-access.log;
    error_log /var/log/nginx/invenflow-staging-error.log;

    # Client body size (for file uploads)
    client_max_body_size 10M;

    # Proxy to backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # WebSocket support (if needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache bypass
        proxy_cache_bypass $http_upgrade;
        
        # Buffering
        proxy_buffering off;
    }

    # Static files (uploads) - optional optimization
    location /uploads/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache static files
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints - optional separate config
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No caching for API
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### 2. Enable site configuration

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/invenflow-staging /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## SSL Certificate Setup (Let's Encrypt)

Jika belum punya SSL certificate:

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d staging.ptunicorn.id

# Auto-renewal (should be set up automatically)
sudo certbot renew --dry-run
```

## Firewall Configuration

Pastikan firewall mengizinkan traffic:

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

## Environment Variables

Pastikan `.env.staging` sudah dikonfigurasi dengan benar:

```env
# CORS Configuration for Staging
CORS_ORIGIN=https://staging.ptunicorn.id,http://localhost:3001,http://localhost:5173
STAGING_DOMAIN=https://staging.ptunicorn.id
FRONTEND_URL=https://staging.ptunicorn.id
```

## Testing

### 1. Test nginx configuration

```bash
# Test config
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# Check logs
sudo tail -f /var/log/nginx/invenflow-staging-access.log
sudo tail -f /var/log/nginx/invenflow-staging-error.log
```

### 2. Test backend accessibility

```bash
# From server
curl http://localhost:3001/api/health

# From external (should work through nginx)
curl https://staging.ptunicorn.id/api/health
```

### 3. Test CORS

```bash
# Test CORS headers
curl -H "Origin: https://staging.ptunicorn.id" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://staging.ptunicorn.id/api/health \
     -v
```

## Troubleshooting

### Backend tidak bisa diakses

1. **Check backend running:**
   ```bash
   pm2 status invenflow-staging
   curl http://localhost:3001/api/health
   ```

2. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/invenflow-staging-error.log
   ```

3. **Check firewall:**
   ```bash
   sudo ufw status
   ```

### CORS errors

1. **Check CORS configuration di backend:**
   ```bash
   pm2 logs invenflow-staging | grep CORS
   ```

2. **Verify environment variables:**
   ```bash
   # Restart PM2 dengan environment variables baru
   pm2 restart invenflow-staging --update-env
   ```

3. **Check browser console** untuk error CORS details

### SSL certificate issues

1. **Renew certificate:**
   ```bash
   sudo certbot renew
   sudo systemctl reload nginx
   ```

2. **Check certificate expiry:**
   ```bash
   sudo certbot certificates
   ```

## Security Considerations

1. **Firewall**: Hanya buka port 80 dan 443, port 3001 tidak perlu di-expose ke public
2. **Rate Limiting**: Pertimbangkan menambahkan rate limiting di nginx
3. **SSL**: Selalu gunakan HTTPS di production/staging
4. **CORS**: Hanya allow origins yang diperlukan

## Performance Optimization (Optional)

```nginx
# Add to server block for better performance
location / {
    # ... existing proxy config ...
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
}
```

## Monitoring

Setup monitoring untuk nginx:

```bash
# Install nginx status module (if not already installed)
# Check nginx version
nginx -v

# Monitor access logs
sudo tail -f /var/log/nginx/invenflow-staging-access.log
```

## Backup Configuration

```bash
# Backup nginx config
sudo cp /etc/nginx/sites-available/invenflow-staging /etc/nginx/sites-available/invenflow-staging.backup

# Restore if needed
sudo cp /etc/nginx/sites-available/invenflow-staging.backup /etc/nginx/sites-available/invenflow-staging
sudo nginx -t
sudo systemctl reload nginx
```

