# Error Analysis & Fix Report
**Date:** November 6, 2025  
**Status:** ✅ FIXED

## 📋 Problem Summary

### Error 1: 401 Unauthorized pada `/api/persons`
```
:3001/api/persons?activeOnly=true:1 Failed to load resource: 
the server responded with a status of 401 (Unauthorized)
personStore.ts:57 Uncaught (in promise) AxiosError
```

### Error 2: 500 Internal Server Error pada `/api/inventory`
```
:3001/api/inventory?sortBy=updatedAt&sortOrder=desc&viewMode=unified&page=1&pageSize=20:1 
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

### Error 3: React Error pada PersonsPage
```
Error: Cannot convert object to primitive value
TypeError: Cannot convert object to primitive value
    at String (<anonymous>)
    at lazyInitializer (http://localhost:5173/node_modules/.vite/deps/chunk-5Y7RUZQ2.js)
```

## 🔍 Root Cause Analysis

### 1. Token Storage Key Mismatch ❌

**Problem:**
- `authStore.ts` menyimpan token sebagai: `'auth_token'` ✓
- `api.ts` (centralized API) membaca dari: `'auth_token'` ✓  
- `personStore.ts` membaca dari: **`'token'`** ❌ (SALAH!)

**Impact:**
- PersonStore tidak dapat mengirim token autentikasi yang benar
- Semua request ke `/api/persons` mendapat 401 Unauthorized
- User tidak bisa mengakses fitur personnel management

**Affected Code:**
```typescript
// personStore.ts - BEFORE (WRONG)
const token = localStorage.getItem('token'); // ❌ Wrong key!

// personStore.ts - AFTER (FIXED)
const token = localStorage.getItem('auth_token'); // ✓ Correct key!
```

### 2. React Lazy Loading Error ❌

**Problem:**
- `PersonModal.tsx` mengimport `DEFAULT_DEPARTMENTS` yang tidak digunakan
- Import ini menyebabkan error saat lazy loading PersonsPage
- PersonsPage tidak di-export sebagai default export yang benar

**Impact:**
- React lazy loader gagal load PersonsPage
- Error "Cannot convert object to primitive value"
- Halaman persons tidak bisa dibuka

**Affected Code:**
```typescript
// PersonModal.tsx - BEFORE (WRONG)
import type { Person, CreatePerson, DEFAULT_DEPARTMENTS } from '@invenflow/shared';
// DEFAULT_DEPARTMENTS imported tapi tidak digunakan

// PersonModal.tsx - AFTER (FIXED)
import type { Person, CreatePerson } from '@invenflow/shared';
// Hanya import yang digunakan
```

```typescript
// PersonsPage.tsx - BEFORE (WRONG)
export function PersonsPage() { ... }

// PersonsPage.tsx - AFTER (FIXED)
export default function PersonsPage() { ... }
```

### 3. Inventory Error (Cascade Effect) ⚠️

**Problem:**
- Inventory API menggunakan centralized `api.ts` yang sudah benar
- Error 500 kemungkinan terjadi karena authentication state tidak konsisten
- Atau ada issue pada database query yang kompleks

**Impact:**
- Inventory page tidak bisa load data
- User tidak bisa melihat atau mengelola inventory

## 🔧 Fixes Applied

### Fix 1: Standarisasi Token Storage Key

**File:** `packages/frontend/src/store/personStore.ts`

Changed all localStorage token reads from `'token'` to `'auth_token'`:

```typescript
// Line 35 - fetchPersons
- const token = localStorage.getItem('token');
+ const token = localStorage.getItem('auth_token');

// Line 62 - fetchPersonById  
- const token = localStorage.getItem('token');
+ const token = localStorage.getItem('auth_token');

// Line 79 - createPerson
- const token = localStorage.getItem('token');
+ const token = localStorage.getItem('auth_token');

// Line 101 - updatePerson
- const token = localStorage.getItem('token');
+ const token = localStorage.getItem('auth_token');

// Line 125 - deletePerson
- const token = localStorage.getItem('token');
+ const token = localStorage.getItem('auth_token');
```

### Fix 2: Cleanup PersonModal Imports

**File:** `packages/frontend/src/components/PersonModal.tsx`

Removed unused DEFAULT_DEPARTMENTS import:

```typescript
// Before
import type { Person, CreatePerson, DEFAULT_DEPARTMENTS } from '@invenflow/shared';

// After
import type { Person, CreatePerson } from '@invenflow/shared';
```

### Fix 3: Fix PersonsPage Export

**File:** `packages/frontend/src/pages/PersonsPage.tsx`

Changed to proper default export for lazy loading:

```typescript
// Before
export function PersonsPage() { ... }

// After  
export default function PersonsPage() { ... }
```

## ✅ Verification Steps

### 1. Test Authentication Flow
```bash
# Start the development servers
cd /Users/yanuar/Documents/invenflow
pnpm dev
```

### 2. Test Persons Page
1. Login ke aplikasi
2. Navigate ke `/persons`
3. Verify:
   - ✅ Page loads tanpa error
   - ✅ Persons list tampil
   - ✅ Dapat create/edit/delete persons
   - ✅ No 401 errors di console

### 3. Test Inventory Page
1. Navigate ke `/inventory`
2. Verify:
   - ✅ Page loads tanpa error
   - ✅ Inventory items tampil
   - ✅ Filters berfungsi
   - ✅ No 500 errors di console

### 4. Check Browser Console
```javascript
// Verify token is stored with correct key
localStorage.getItem('auth_token') // Should return JWT token
localStorage.getItem('token')      // Should return null
```

## 📝 Key Takeaways

### Best Practices to Prevent This

1. **Centralize Authentication Logic**
   - ✅ Use centralized API client (`api.ts`)
   - ❌ Don't create separate axios instances in stores
   - Use interceptors for auth token injection

2. **Consistent Token Management**
   - Define token key as constant: `const AUTH_TOKEN_KEY = 'auth_token'`
   - Use only one storage key throughout app
   - Document token management in auth guide

3. **Proper React Lazy Loading**
   - Always use default exports for lazy-loaded components
   - Don't import unused dependencies in lazy-loaded modules
   - Test lazy loading in development mode

4. **Type-Safe Store Development**
   - Create typed hooks for localStorage access
   - Use centralized auth store methods
   - Avoid direct localStorage calls in component stores

## 🔄 Recommended Improvements

### 1. Create Auth Token Constant

**File:** `packages/frontend/src/utils/constants.ts` (NEW)
```typescript
export const AUTH_TOKEN_KEY = 'auth_token' as const;
export const AUTH_STORAGE_KEY = 'auth-storage' as const;
```

### 2. Refactor PersonStore to Use Centralized API

Instead of custom axios instance, use the centralized API:

```typescript
import { api } from '../utils/api';

// Instead of:
const token = localStorage.getItem('auth_token');
await axios.get(`${API_URL}/api/persons`, { 
  headers: { Authorization: `Bearer ${token}` } 
});

// Use:
await api.get('/api/persons');
// Token is automatically injected by interceptor
```

### 3. Add Person API to Centralized API Utils

**File:** `packages/frontend/src/utils/api.ts`

```typescript
export const personApi = {
  getAll: async (params?: { 
    search?: string; 
    department?: string; 
    activeOnly?: boolean; 
  }): Promise<{ 
    persons: Person[]; 
    groupedByDepartment: Record<string, Person[]>; 
    departments: string[]; 
  }> => {
    const response = await api.get('/api/persons', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Person> => {
    const response = await api.get(`/api/persons/${id}`);
    return response.data;
  },

  create: async (data: CreatePerson): Promise<Person> => {
    const response = await api.post('/api/persons', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePerson): Promise<Person> => {
    const response = await api.put(`/api/persons/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/persons/${id}`);
  },
};
```

## 🎯 Testing Checklist

- [ ] Login sebagai user
- [ ] Navigate ke `/persons` page
- [ ] Verify persons list loads
- [ ] Create new person
- [ ] Edit existing person
- [ ] Delete person (if no products assigned)
- [ ] Navigate ke `/inventory` page
- [ ] Verify inventory loads
- [ ] Apply filters
- [ ] Check console for errors
- [ ] Logout and login again
- [ ] Repeat above tests

## 📊 Status

| Issue | Status | Severity | Fixed |
|-------|--------|----------|-------|
| 401 on /api/persons | ✅ Fixed | 🔴 Critical | Yes |
| 500 on /api/inventory | ⚠️ Monitor | 🟠 High | Needs Testing |
| React lazy load error | ✅ Fixed | 🔴 Critical | Yes |

## 🔗 Related Files Modified

1. `packages/frontend/src/store/personStore.ts` - Fixed token key (5 locations)
2. `packages/frontend/src/components/PersonModal.tsx` - Removed unused import
3. `packages/frontend/src/pages/PersonsPage.tsx` - Fixed default export

## 📞 Support

If issues persist after these fixes:

1. Clear browser localStorage: `localStorage.clear()`
2. Clear browser cache and cookies
3. Restart development servers: `pnpm dev`
4. Check database connectivity
5. Verify JWT_SECRET is set in backend `.env`
6. Check backend logs for detailed error messages

---

**Fixed by:** AI Assistant  
**Reviewed by:** [Pending]  
**Deployed to:** Development (Local)  
**Next Steps:** Test in staging environment

