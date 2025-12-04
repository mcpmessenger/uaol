# Database Connection Issue - Root Cause Analysis

## The Problem

The `job-orchestration-service` is trying to connect to `localhost:5432` instead of the Supabase database, even though `DATABASE_URL` is correctly set in `backend/.env`.

## Root Cause

### 1. **Module Loading Order Issue**
- Multiple services (auth, tool-registry, billing, etc.) import database models at the **top level** of their controller/middleware files
- Example: `backend/services/auth-service/src/middleware/authenticate.ts` has:
  ```typescript
  import { getDatabasePool } from '@uaol/shared/database/connection';
  const userModel = new UserModel(getDatabasePool()); // ← Called when module loads!
  ```
- When these modules are imported, `getDatabasePool()` is called **immediately**
- At that moment, `process.env.DATABASE_URL` might not be set yet (if the service hasn't loaded `.env`)

### 2. **Shared Config Module Timing**
- The `shared/config` module loads `.env` when it's first imported
- But if multiple services import it concurrently, the **first** import might happen before `.env` is loaded
- The config getter for `database.url` reads from `process.env.DATABASE_URL`, but if it's not set yet, it falls back to the default localhost value

### 3. **Singleton Pool Caching**
- The database pool is a **singleton** - created once and cached
- If it's created with `localhost` by an early service, all subsequent services use that same pool
- Even if we try to recreate it later, the old pool might still be in use

## Current State

- ✅ `process.env.DATABASE_URL` IS set correctly (we see it in logs)
- ❌ `config.database.url` returns localhost (the getter is reading the wrong value)
- ❌ Pool is created with localhost connection string
- ❌ No `[DB Connection]` logs appearing (suggests pool was created before our logging was added, OR logs are suppressed)

## The Solution

### Option 1: Ensure All Services Load .env First (Recommended)
Make every service load `.env` **before** importing anything that uses the database:

```typescript
// At the VERY TOP of each service's index.ts
import dotenv from 'dotenv';
import { resolve } from 'path';
// ... load .env ...
// THEN import other modules
```

### Option 2: Make Pool Creation Truly Lazy
Don't create the pool until the first actual database query, not when modules load.

### Option 3: Force Pool Recreation on Mismatch
When `getDatabasePool()` is called, if `process.env.DATABASE_URL` is set and differs from the pool's connection string, **always** recreate it.

## Why We're Not Seeing Logs

The `[DB Connection]` logs aren't appearing, which suggests:
1. The pool was created **before** we added the logging
2. The pool is cached and `getDatabasePool()` returns the cached pool without executing our new code
3. The logs are being suppressed or filtered

## Next Steps

1. **Verify which service creates the pool first** - Add logging to see the import order
2. **Ensure all services load .env first** - Add `.env` loading to auth-service, tool-registry-service, etc.
3. **Make pool recreation more aggressive** - Always check `process.env.DATABASE_URL` and recreate if different
