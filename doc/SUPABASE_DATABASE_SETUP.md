# Setting Up Database with Supabase

## Current Situation

Your `DATABASE_URL` is pointing to **Supabase** (not CockroachDB):
```
DATABASE_URL=postgresql://postgres.yhdgadyquizxrfmehkno:...@aws-0-us-west-2.pooler.supabase.com:5432/postgres
```

This is using the `postgres` database in Supabase.

## Option 1: Use Existing `postgres` Database (Easiest) ✅

Supabase uses the `postgres` database by default. You can run migrations directly to it:

### Step 1: Verify You're Connected to `postgres`

Your connection string already uses `/postgres`, so you're good!

### Step 2: Run Migrations

```powershell
cd backend
npm run migrate
```

### Step 3: Verify Tables in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **Table Editor** (left sidebar)
4. You should see tables like:
   - `users`
   - `mcp_tools`
   - `processing_jobs`
   - `files`
   - `credits_transactions`
   - `tool_executions`

**OR** use the SQL Editor in Supabase:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

## Option 2: Create `uaol` Database in Supabase

If you want a separate `uaol` database (not recommended for Supabase):

### Step 1: Create Database via Supabase SQL Editor

1. Go to Supabase Dashboard → **SQL Editor**
2. Run:
   ```sql
   CREATE DATABASE uaol;
   ```

**Note**: Supabase typically uses a single `postgres` database with multiple schemas. Creating a new database may not be supported or recommended.

### Step 2: Update Connection String

Change your `backend/.env`:
```env
DATABASE_URL=postgresql://postgres.yhdgadyquizxrfmehkno:...@aws-0-us-west-2.pooler.supabase.com:5432/uaol?sslmode=require
```

### Step 3: Run Migrations

```powershell
cd backend
npm run migrate
```

## Recommended Approach for Supabase

**Use the `postgres` database** (Option 1) because:
- ✅ Supabase is designed to use the `postgres` database
- ✅ Your connection string already points to it
- ✅ No changes needed
- ✅ All tables will be in the `public` schema

## Quick Steps (Recommended)

1. **Your connection string is already correct** - it uses `/postgres`
2. **Run migrations:**
   ```powershell
   cd backend
   npm run migrate
   ```
3. **Verify in Supabase Dashboard:**
   - Go to **Table Editor**
   - You should see all your tables

## Troubleshooting

### Migrations Fail

1. **Check connection string format:**
   ```powershell
   Get-Content backend\.env | Select-String "DATABASE_URL"
   ```
   Should end with `/postgres` (or `/uaol` if you created it)

2. **Verify Supabase connection:**
   - Check your Supabase project is active
   - Verify the connection string from Supabase dashboard
   - Make sure IP is whitelisted (if using IP restrictions)

3. **Check migration logs:**
   ```powershell
   cd backend
   npm run migrate
   ```
   Look for error messages

### Tables Not Showing in Supabase

1. **Refresh the Table Editor** in Supabase dashboard
2. **Check the correct schema:**
   ```sql
   SELECT table_schema, table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
3. **Verify migrations ran successfully:**
   - Check terminal output for errors
   - Look for "Database migrations completed successfully"

## Summary

Since you're using **Supabase**, you should:
1. ✅ Keep using `/postgres` in your connection string (already done)
2. ✅ Run `npm run migrate` from `backend/` directory
3. ✅ Check Supabase Table Editor to verify tables were created

No need to create a separate `uaol` database - Supabase uses the `postgres` database with schemas.
