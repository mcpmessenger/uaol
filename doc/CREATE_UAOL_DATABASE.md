# Creating the UAOL Database in CockroachDB

## The Problem

Your `SHOW DATABASES;` query shows only:
- `defaultdb`
- `postgres`
- `system`

But **no `uaol` database exists**. If your `DATABASE_URL` points to `/uaol`, migrations will fail because the database doesn't exist.

## Solution: Create the Database First

### Option 1: Create Database via SQL Shell (Recommended)

1. **In CockroachDB Cloud SQL Shell**, run:
   ```sql
   CREATE DATABASE uaol;
   ```

2. **Verify it was created:**
   ```sql
   SHOW DATABASES;
   ```
   You should now see `uaol` in the list.

3. **Switch to the new database:**
   ```sql
   USE uaol;
   ```

4. **Run migrations:**
   ```powershell
   cd backend
   npm run migrate
   ```

5. **Verify tables were created:**
   ```sql
   SHOW TABLES;
   ```

### Option 2: Use Existing `postgres` Database

If you prefer to use the existing `postgres` database instead:

1. **Update your `backend/.env` file:**
   ```env
   # Change from:
   DATABASE_URL=postgresql://user:password@host:26257/uaol?sslmode=require
   
   # To:
   DATABASE_URL=postgresql://user:password@host:26257/postgres?sslmode=require
   ```

2. **In SQL Shell, switch to postgres:**
   ```sql
   USE postgres;
   ```

3. **Run migrations:**
   ```powershell
   cd backend
   npm run migrate
   ```

4. **Verify tables:**
   ```sql
   SHOW TABLES;
   ```

### Option 3: Use `defaultdb`

You can also use `defaultdb`:

1. **Update your `backend/.env` file:**
   ```env
   DATABASE_URL=postgresql://user:password@host:26257/defaultdb?sslmode=require
   ```

2. **In SQL Shell, you're already connected to `defaultdb`**

3. **Run migrations:**
   ```powershell
   cd backend
   npm run migrate
   ```

4. **Verify tables:**
   ```sql
   SHOW TABLES;
   ```

## Recommended Approach

**I recommend Option 1 (Create `uaol` database)** because:
- ✅ Keeps your application data separate from system databases
- ✅ Matches the project name and makes it clear this is your app's database
- ✅ Easier to manage and backup separately
- ✅ Follows best practices for database organization

## Step-by-Step: Create `uaol` Database

### Step 1: Check Your Current Connection String

```powershell
# In PowerShell
Get-Content backend\.env | Select-String "DATABASE_URL"
```

Note which database it's pointing to (the part after the last `/`).

### Step 2: Create the Database

In CockroachDB Cloud SQL Shell:
```sql
CREATE DATABASE uaol;
```

**Expected Output:**
```
CREATE DATABASE
```

### Step 3: Verify Database Exists

```sql
SHOW DATABASES;
```

You should now see `uaol` in the list.

### Step 4: Update Connection String (If Needed)

If your `DATABASE_URL` doesn't already point to `uaol`, update `backend/.env`:

```env
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/uaol?sslmode=require
```

**Important**: Replace `[username]`, `[password]`, and `[host]` with your actual values from CockroachDB Cloud.

### Step 5: Run Migrations

```powershell
cd backend
npm run migrate
```

**Expected Output:**
```
[info] Starting database migrations...
[info] Connecting to database...
[info] Executing schema...
[info] Database migrations completed successfully
```

### Step 6: Verify Tables Were Created

In SQL Shell (make sure you're connected to `uaol`):
```sql
USE uaol;
SHOW TABLES;
```

**Expected Output:**
```
  schema_name | table_name
--------------+------------
  public      | users
  public      | mcp_tools
  public      | processing_jobs
  public      | files
  public      | credits_transactions
  public      | tool_executions
```

## Troubleshooting

### Error: "database already exists"

If you see this error, the database already exists. Just switch to it:
```sql
USE uaol;
SHOW TABLES;
```

### Error: "permission denied"

Make sure you're using a user with `CREATE DATABASE` permissions. In CockroachDB Cloud, the default user (`root`) should have these permissions.

### Migrations Still Fail After Creating Database

1. **Verify connection string** points to `uaol`:
   ```powershell
   Get-Content backend\.env | Select-String "DATABASE_URL"
   ```

2. **Check connection string format**:
   ```
   postgresql://[user]:[password]@[host]:26257/uaol?sslmode=require
   ```
   The `/uaol` part must be present.

3. **Test connection manually**:
   ```powershell
   cd backend
   node -e "require('dotenv').config({path:'.env'}); console.log(process.env.DATABASE_URL)"
   ```

## Quick Checklist

- [ ] Created `uaol` database with `CREATE DATABASE uaol;`
- [ ] Verified database exists with `SHOW DATABASES;`
- [ ] Updated `DATABASE_URL` in `backend/.env` to use `/uaol`
- [ ] Ran `npm run migrate` from `backend/` directory
- [ ] Switched to `uaol` database in SQL Shell: `USE uaol;`
- [ ] Verified tables exist: `SHOW TABLES;`

---

**Remember**: The database must exist before migrations can create tables in it!
