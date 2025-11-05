# Backend Build Process

## Overview

Backend menggunakan **Hybrid Approach** untuk mengatasi masalah ES modules di Node.js:
- **Development**: Menggunakan `tsx` untuk direct execution (tidak perlu extension `.js`)
- **Production**: Menggunakan `tsc` untuk compile + post-build script untuk fix imports

## Build Process

### Development Mode
```bash
pnpm dev
```
- Menggunakan `tsx watch` untuk hot-reload
- Tidak perlu extension `.js` di import statements
- Langsung execute TypeScript files

### Production Build
```bash
pnpm build
```

Build process terdiri dari 2 langkah:
1. **TypeScript Compilation** (`tsc`)
   - Compile semua `.ts` files ke `.js` di folder `dist/`
   - Type checking dan type safety

2. **Import Fixing** (`npm run fix-imports`)
   - Script otomatis menambahkan extension `.js` ke semua relative imports
   - File: `scripts/fix-imports.js`
   - Memperbaiki:
     - `from "./module"` → `from "./module.js"`
     - `import "./module"` → `import "./module.js"`
     - `from "../module"` → `from "../module.js"`

## Available Scripts

```bash
# Development
pnpm dev              # Start with tsx watch (hot-reload)

# Build
pnpm build             # Full build (tsc + fix-imports)
pnpm build:tsc         # TypeScript compile only
pnpm fix-imports       # Fix imports only (run after tsc)

# Production
pnpm start             # Run compiled code from dist/
```

## Why This Approach?

### Problem
ES modules di Node.js memerlukan extension `.js` untuk relative imports:
```javascript
// ❌ Error: Cannot find module
import { env } from "./config/env";

// ✅ Correct
import { env } from "./config/env.js";
```

### Solution
1. **Development**: Menggunakan `tsx` yang tidak memerlukan extension
2. **Production**: Post-build script otomatis menambahkan extension

### Benefits
- ✅ **Development Experience**: Tidak perlu menambahkan `.js` manual di setiap import
- ✅ **Type Safety**: Tetap menggunakan TypeScript compiler untuk type checking
- ✅ **Automatic**: Build process otomatis menangani fix imports
- ✅ **No Code Changes**: Tidak perlu mengubah source code

## How It Works

### Fix Imports Script (`scripts/fix-imports.js`)

Script ini:
1. Walk melalui semua `.js` files di folder `dist/`
2. Mencari semua relative imports tanpa extension
3. Menambahkan extension `.js` secara otomatis
4. Menyimpan file yang sudah diperbaiki

**Example:**
```javascript
// Before (from TypeScript compilation)
import { env } from "./config/env";
import { db } from "../db";

// After (after fix-imports script)
import { env } from "./config/env.js";
import { db } from "../db.js";
```

## Troubleshooting

### Build succeeds but runtime errors

1. **Check if fix-imports ran:**
   ```bash
   pnpm build
   # Should see: "✅ Fixed X file(s)"
   ```

2. **Manually run fix-imports:**
   ```bash
   pnpm fix-imports
   ```

3. **Check dist files:**
   ```bash
   grep -r "from.*\.\./.*['\"]" packages/backend/dist
   # Should show all imports with .js extension
   ```

### Import still missing extension

1. **Rebuild from scratch:**
   ```bash
   pnpm clean
   pnpm build
   ```

2. **Check script is executable:**
   ```bash
   ls -la packages/backend/scripts/fix-imports.js
   ```

3. **Run script manually:**
   ```bash
   node packages/backend/scripts/fix-imports.js
   ```

## File Structure

```
packages/backend/
├── src/                    # TypeScript source files
│   ├── index.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── dotenv.ts
│   └── ...
├── dist/                   # Compiled JavaScript files
│   ├── index.js            # (with .js extensions in imports)
│   ├── config/
│   │   ├── env.js
│   │   └── dotenv.js
│   └── ...
├── scripts/
│   └── fix-imports.js      # Post-build import fixer
└── package.json
```

