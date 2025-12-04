# Database Setup Guide

## Supabase vs PostgreSQL

**Good news:** Supabase is built on PostgreSQL, so it's **100% compatible** with this backend! You can use either option.

### Supabase (Recommended for Development)

**Pros:**
- ✅ Free tier available (perfect for development)
- ✅ Managed PostgreSQL (no local setup needed)
- ✅ Built-in dashboard and SQL editor
- ✅ Automatic backups
- ✅ Easy connection string
- ✅ Supports all PostgreSQL features we use (UUID, JSONB, etc.)

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ Free tier has limits (500MB database, 2GB bandwidth)

### Local PostgreSQL

**Pros:**
- ✅ Works offline
- ✅ Full control
- ✅ No usage limits
- ✅ Good for production-like testing

**Cons:**
- ⚠️ Requires local installation
- ⚠️ Manual setup and maintenance
- ⚠️ Need to manage backups yourself

## Setting Up Supabase

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Name**: UAOL (or your choice)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
5. Wait 2-3 minutes for project to be created

### 2. Get Your Connection String

1. In your Supabase project, go to **Settings** → **Database**
2. Scroll to **Connection String**
3. Select **URI** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password you set when creating the project

### 3. Update Your .env File

```env
DATABASE_URL=postgresql://postgres:your-actual-password@db.xxxxx.supabase.co:5432/postgres
```

### 4. Run Migrations

```powershell
npm run migrate
```

This will create all the tables in your Supabase database.

### 5. Verify in Supabase Dashboard

1. Go to **Table Editor** in Supabase
2. You should see:
   - `users`
   - `mcp_tools`
   - `processing_jobs`

## Setting Up Local PostgreSQL

### Option A: Using Docker (Easiest)

```powershell
# Start PostgreSQL container
docker run --name uaol-postgres `
  -e POSTGRES_USER=uaol `
  -e POSTGRES_PASSWORD=uaol_password `
  -e POSTGRES_DB=uaol `
  -p 5432:5432 `
  -d postgres:15-alpine

# Or use docker-compose (already configured)
docker-compose up -d postgres
```

Then in `.env`:
```env
DATABASE_URL=postgresql://uaol:uaol_password@localhost:5432/uaol
```

### Option B: Install PostgreSQL Locally

1. Download from [postgresql.org](https://www.postgresql.org/download/)
2. Install and set a password
3. Create database:
   ```sql
   CREATE DATABASE uaol;
   ```
4. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:your-password@localhost:5432/uaol
   ```

## Running Migrations

After setting up either option:

```powershell
npm run migrate
```

This will:
- Enable UUID extension (if not already enabled)
- Create all tables
- Create indexes
- Set up triggers

## Verifying Connection

Test your database connection:

```powershell
# Using psql (if installed)
psql "your-connection-string"

# Or test from Node.js
node -e "import('pg').then(pg => { const pool = new pg.Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()').then(r => {console.log('Connected!', r.rows[0]); pool.end();}); })"
```

## Schema Compatibility

The schema uses standard PostgreSQL features that work with:
- ✅ Supabase
- ✅ Local PostgreSQL
- ✅ Neon
- ✅ Railway
- ✅ Render
- ✅ AWS RDS PostgreSQL
- ✅ Google Cloud SQL

**Note:** The schema uses `uuid-ossp` extension which is available in all modern PostgreSQL installations including Supabase.

## Troubleshooting

### "Extension uuid-ossp does not exist"

Supabase enables this by default, but if you see this error:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Connection Timeout

- Check your connection string
- For Supabase: Ensure you're using the correct password
- For local: Ensure PostgreSQL is running

### SSL Connection Required

Some providers require SSL. Add `?sslmode=require` to your connection string:
```
DATABASE_URL=postgresql://...?sslmode=require
```

## Recommendation

**For Development:** Use Supabase - it's the fastest way to get started
**For Production:** Use managed PostgreSQL (Supabase Pro, AWS RDS, etc.) or your own PostgreSQL server

