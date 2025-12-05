# Why SHOW TABLES Returns No Results

## The Issue

When you run `SHOW TABLES;` in CockroachDB Cloud SQL Shell, you see "No results returned" even though migrations may have run successfully.

## Common Causes

### 1. Wrong Database Selected

**Problem**: You're connected to `defaultdb`, but your tables are in a different database.

**Solution**: 
1. First, check what databases exist:
   ```sql
   SHOW DATABASES;
   ```

2. Look for one of these databases:
   - `uaol` (if your connection string uses `/uaol`)
   - `postgres` (if your connection string uses `/postgres`)
   - `defaultdb` (if your connection string uses `/defaultdb`)

3. Switch to the correct database:
   ```sql
   USE uaol;  -- or USE postgres; or USE defaultdb;
   ```

4. Then check for tables:
   ```sql
   SHOW TABLES;
   ```

### 2. Migrations Haven't Run Yet

**Problem**: The database exists but migrations haven't been executed.

**Solution**:
```powershell
cd backend
npm run migrate
```

**Expected Output**:
```
[info] Starting database migrations...
[info] Connecting to database...
[info] Executing schema...
[info] Database migrations completed successfully
```

### 3. Connection String Database Mismatch

**Problem**: Your `DATABASE_URL` in `backend/.env` points to one database, but you're querying a different one in the SQL Shell.

**How to Check**:
1. Look at your `backend/.env` file
2. Find the `DATABASE_URL` line
3. Check the database name in the connection string:
   ```
   postgresql://user:password@host:26257/[DATABASE_NAME]?sslmode=require
   ```
   The `[DATABASE_NAME]` is what database your app connects to.

**Solution**: 
- In the SQL Shell, switch to the database that matches your connection string
- Or update your connection string to use the database you're querying

## Step-by-Step Troubleshooting

### Step 1: Check What Databases Exist

In CockroachDB Cloud SQL Shell, run:
```sql
SHOW DATABASES;
```

You should see something like:
```
  database_name
-----------------
  defaultdb
  postgres
  uaol
  system
```

### Step 2: Check Your Connection String

Look at `backend/.env`:
```powershell
# In PowerShell
Get-Content backend\.env | Select-String "DATABASE_URL"
```

The database name is the part after the last `/` and before the `?`:
```
postgresql://user:pass@host:26257/uaol?sslmode=require
                                    ^^^^
                                    This is the database name
```

### Step 3: Switch to the Correct Database

In the SQL Shell, use the database from your connection string:
```sql
USE uaol;  -- Replace 'uaol' with your actual database name
```

### Step 4: Check for Tables

```sql
SHOW TABLES;
```

You should now see tables like:
```
  schema_name | table_name
--------------+------------
  public      | users
  public      | mcp_tools
  public      | processing_jobs
  public      | files
  public      | credits_transactions
  ...
```

### Step 5: If Still No Tables, Run Migrations

```powershell
cd backend
npm run migrate
```

Then check again:
```sql
SHOW TABLES;
```

## Quick Checklist

- [ ] Ran `SHOW DATABASES;` to see all databases
- [ ] Checked `DATABASE_URL` in `backend/.env` to see which database it uses
- [ ] Switched to the correct database with `USE [database_name];`
- [ ] Ran `SHOW TABLES;` again
- [ ] If still empty, ran `npm run migrate` from `backend/` directory
- [ ] Verified migrations completed successfully
- [ ] Checked `SHOW TABLES;` one more time

## Expected Tables

After successful migrations, you should see these tables:
- `users` - User accounts and authentication
- `mcp_tools` - Registered MCP tools
- `processing_jobs` - Workflow execution jobs
- `files` - File storage metadata
- `credits_transactions` - Billing and credit tracking
- `tool_executions` - Tool execution history

## Still Having Issues?

If you've tried all the above and still see no tables:

1. **Check Migration Logs**: Look for errors when running `npm run migrate`
2. **Verify Connection**: Make sure your `DATABASE_URL` is correct
3. **Check Database Permissions**: Ensure your user has CREATE TABLE permissions
4. **Open a GitHub Issue**: Include:
   - Output of `SHOW DATABASES;`
   - Your `DATABASE_URL` format (hide password)
   - Output from `npm run migrate`
   - Any error messages

---

**Remember**: The database name in your connection string must match the database you're querying in the SQL Shell!
