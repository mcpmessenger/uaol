# Quick Guide: Create UAOL Database

## ✅ Easiest Method: Use Web SQL Shell

You already have the CockroachDB Cloud SQL Shell open. Just follow these steps:

### Step 1: Create the Database

In the SQL Shell, run:
```sql
CREATE DATABASE uaol;
```

**Expected Output:**
```
CREATE DATABASE
```

### Step 2: Verify Database Exists

```sql
SHOW DATABASES;
```

You should now see `uaol` in the list along with `defaultdb`, `postgres`, and `system`.

### Step 3: Switch to the New Database

```sql
USE uaol;
```

### Step 4: Verify Your Connection String

Check that your `backend/.env` file uses `/uaol`:

```powershell
Get-Content backend\.env | Select-String "DATABASE_URL"
```

It should look like:
```
DATABASE_URL=postgresql://[user]:[password]@[host]:26257/uaol?sslmode=require
```

**If it doesn't have `/uaol`**, update it to use the `uaol` database.

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

Back in the SQL Shell (make sure you're connected to `uaol`):
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

## 🎯 Quick Checklist

- [ ] Run `CREATE DATABASE uaol;` in SQL Shell
- [ ] Verify with `SHOW DATABASES;`
- [ ] Switch to database: `USE uaol;`
- [ ] Check `DATABASE_URL` in `backend/.env` uses `/uaol`
- [ ] Run `npm run migrate` from `backend/` directory
- [ ] Verify tables: `USE uaol; SHOW TABLES;`

## ⚠️ Common Issues

### Issue: "database already exists"
**Solution**: The database already exists! Just switch to it:
```sql
USE uaol;
SHOW TABLES;
```

### Issue: Migrations fail with "database does not exist"
**Solution**: 
1. Make sure you created the database: `SHOW DATABASES;`
2. Check your `DATABASE_URL` has `/uaol` in it
3. Restart services after updating `.env`

### Issue: Still no tables after migrations
**Solution**:
1. Make sure you're in the right database: `USE uaol;`
2. Check migration output for errors
3. Verify connection string is correct

---

**That's it!** Once you see the tables, your database is ready to use. 🎉
