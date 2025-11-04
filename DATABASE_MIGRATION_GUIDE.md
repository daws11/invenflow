# Database Migration Guide

## Overview

InvenFlow menggunakan Drizzle ORM dengan dua workflow untuk mengelola perubahan database schema: **Migration-based** dan **Push-based**.

## Available Scripts

### Root Level Commands (dari project root)
```bash
pnpm db:generate    # Generate migration files dari schema changes
pnpm db:migrate     # Jalankan migration files ke database
pnpm db:push        # Push schema changes langsung ke database
pnpm db:studio      # Buka Drizzle Studio (database GUI)
```

### Backend Package Commands (dari packages/backend)
```bash
pnpm db:generate    # Generate migration files
pnpm db:migrate     # Apply migrations
pnpm db:push        # Push schema changes (dengan automatic fallback)
pnpm db:studio      # Database studio
```

**Environment Variables:**
- `DATABASE_URL` : PostgreSQL connection string (optional, ada fallback)

## Workflow Options

### Option 1: Migration-based Workflow (Recommended untuk Production)

**Use case:** Production environment, team collaboration, version control

**Steps:**
1. **Make schema changes** di `packages/backend/src/db/schema/`
2. **Generate migration:**
   ```bash
   pnpm db:generate
   ```
3. **Review generated SQL** di `packages/backend/src/db/migrations/`
4. **Apply migration:**
   ```bash
   pnpm db:migrate
   ```

**Benefits:**
✅ Version control untuk semua perubahan
✅ Review process sebelum apply
✅ Safe untuk production
✅ Rollback capability
✅ Team collaboration friendly

### Option 2: Push-based Workflow (Recommended untuk Development)

**Use case:** Development environment, rapid prototyping, experimental changes

**Steps:**
1. **Make schema changes** di `packages/backend/src/db/schema/`
2. **Push ke database:**
   ```bash
   pnpm db:push
   ```

**Benefits:**
✅ Faster development cycle
✅ No migration file management
✅ Direct schema synchronization
✅ Good for experimental changes

## Best Practices

### Development Flow
1. **Early Development**: Gunakan `pnpm db:push` untuk rapid prototyping
2. **Stable Features**: Switch ke `pnpm db:generate` + `pnpm db:migrate`
3. **Before Deployment**: Selalu gunakan migration-based workflow

### Production Deployment
1. **Selalu gunakan migration-based workflow**
2. **Test migrations** di staging environment
3. **Backup database** sebelum migration
4. **Review migration files** sebelum apply

### Environment Setup
Pastikan `.env` file sudah terkonfigurasi dengan benar:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/invenflow
```

## Troubleshooting

### Error: "unknown command 'migrate'"
**Fix:** Script sudah diperbaiki. Gunakan `pnpm db:migrate` yang sekarang menggunakan `drizzle-kit up:pg`.

### Error: "Only 'pg' is available options for '--driver'"
**Fix:** Script sudah diperbaiki dengan menambahkan `--driver=pg` parameter.

### Error: Foreign Key Constraint Violation
**Cause:** Data inconsistency antara tabel yang berelasi.
**Solution:**
1. Identify orphaned records:
   ```sql
   SELECT pv.product_id FROM product_validations pv
   LEFT JOIN products p ON pv.product_id = p.id
   WHERE p.id IS NULL;
   ```
2. Clean up orphaned records:
   ```sql
   DELETE FROM product_validations WHERE product_id NOT IN (SELECT id FROM products);
   ```

### Error: "Either 'connectionString' or 'host', 'database' are required"
**Fix:** Script sudah diperbaiki dengan explicit connection string parameter dan fallback value.

### Migration Conflicts
**Solution:**
1. Check migration files di `src/db/migrations/`
2. Delete atau rename conflicting migrations
3. Generate ulang dengan `pnpm db:generate`

### Connection Issues
**Check:**
1. DATABASE_URL environment variable (optional, ada fallback)
2. PostgreSQL server status
3. Database existence

### Data Loss Warnings
**Warning:** Drizzle mungkin menampilkan peringatan data loss untuk perubahan tipe data. Ini normal untuk timestamp fields yang sudah diperbaiki.

## Advanced Usage

### Custom Migration Output
```bash
drizzle-kit generate:pg --out ./custom-migrations-folder
```

### Specific Schema Files
```bash
drizzle-kit push:pg --schema ./src/db/schema/users.ts
```

### Verbose Mode
```bash
drizzle-kit push:pg --verbose
```

## Migration File Structure

Migration files disimpan di `packages/backend/src/db/migrations/` dengan format:
```
0000_initial_schema.sql
0001_add_users_table.sql
0002_add_locations_table.sql
...
```

Setiap migration file berisi SQL statements yang akan dijalankan ke database.