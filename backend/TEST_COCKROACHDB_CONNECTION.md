# Testing CockroachDB Connection

## Quick Test Steps

### 1. Test Database Connection with Migrations

The easiest way to test your CockroachDB connection is to run the migration script, which will:
- Connect to your database
- Create all necessary tables
- Verify the connection works

```powershell
cd backend
npm run migrate
```

**Expected Output (Success):**
```
[info] Starting database migrations...
[info] Connecting to database...
[info] Running additional migrations...
[info] Database migrations completed successfully
```

**If you see errors**, see the Troubleshooting section below.

### 2. Verify Tables Were Created

After successful migration, verify tables exist:

**Option A: Using CockroachDB Cloud Console**
1. Go to [CockroachDB Cloud Console](https://cockroachlabs.cloud)
2. Click on your cluster
3. Click **"SQL Shell"** or **"Databases"**
4. Run:
   ```sql
   SHOW TABLES;
   ```
5. You should see tables like:
   - `users`
   - `mcp_tools`
   - `processing_jobs`
   - `guest_sessions` (if guest mode migration ran)

**Option B: Using psql (if installed)**
```powershell
# Test connection (replace with your actual connection string)
psql "postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt"

# Once connected, run:
SHOW TABLES;
```

### 3. Test a Simple Query

In the CockroachDB SQL Shell or psql:

```sql
-- Check if users table exists and is accessible
SELECT COUNT(*) FROM users;

-- Check database version (CockroachDB specific)
SELECT version();
```

### 4. Test Backend Services Can Connect

Start the backend services to verify they can connect:

```powershell
cd backend
npm run dev
```

**Look for:**
- No database connection errors in the logs
- Services starting successfully
- API Gateway showing `DATABASE_URL: ✓ SET` in the startup logs

## Troubleshooting

### Error: "SSL connection required"

**Problem**: Your connection string is missing SSL configuration.

**Solution**: Add `?sslmode=require` to your connection string:
```env
DATABASE_URL=postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require
```

### Error: "certificate verify failed"

**Problem**: Certificate path is incorrect or certificate not found.

**Solution**: 
1. Verify certificate exists:
   ```powershell
   Test-Path $env:appdata\postgresql\root.crt
   ```
2. If missing, download it again:
   ```powershell
   mkdir -p $env:appdata\postgresql\
   Invoke-WebRequest -Uri https://cockroachlabs.cloud/clusters/[CLUSTER_ID]/cert -OutFile $env:appdata\postgresql\root.crt
   ```
3. Update connection string with correct path:
   ```env
   DATABASE_URL=postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt
   ```

### Error: "password authentication failed"

**Problem**: Incorrect username or password.

**Solution**:
1. Double-check your credentials in CockroachDB Cloud console
2. If password has special characters, make sure they're URL-encoded:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - `&` → `%26`
   - `?` → `%3F`
3. Try regenerating the connection string from CockroachDB Cloud console

### Error: "Connection refused" or "Connection timeout"

**Problem**: Network/firewall issue or IP not whitelisted.

**Solution**:
1. Check your IP is whitelisted in CockroachDB Cloud:
   - Go to your cluster in CockroachDB Cloud
   - Click **"Networking"** or **"IP Allowlist"**
   - Add your current IP address
2. Check firewall settings
3. Verify the host and port (should be port `26257`)

### Error: "database does not exist"

**Problem**: The database name in your connection string doesn't exist.

**Solution**:
1. Check what databases exist:
   ```sql
   SHOW DATABASES;
   ```
2. Create the database if needed:
   ```sql
   CREATE DATABASE uaol;
   ```
3. Update your connection string with the correct database name

### Error: "relation already exists" or "table already exists"

**Problem**: Migrations were already run before.

**Solution**: This is usually OK - it means tables already exist. The migration script handles this gracefully. You can:
- Ignore the warning (tables are already created)
- Or drop and recreate if you want a fresh start:
  ```sql
  DROP TABLE IF EXISTS users CASCADE;
  DROP TABLE IF EXISTS mcp_tools CASCADE;
  DROP TABLE IF EXISTS processing_jobs CASCADE;
  -- Then run migrations again
  ```

## Manual Connection Test Script

You can also create a simple test script to verify the connection:

**Create `backend/test-connection.js`:**
```javascript
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW(), version()');
    console.log('✅ Connection successful!');
    console.log('Current time:', result.rows[0].now);
    console.log('Database version:', result.rows[0].version);
    
    // Test if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\n📊 Tables found:', tables.rows.map(r => r.table_name));
    
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

**Run it:**
```powershell
cd backend
node test-connection.js
```

## Next Steps After Successful Connection

1. ✅ **Verify tables**: Check that all tables were created
2. ✅ **Test API endpoints**: Start services and test API calls
3. ✅ **Test Billing Service**: Verify transactions work with serializable isolation
4. ✅ **Monitor CockroachDB Cloud**: Check metrics in the dashboard

## Quick Checklist

- [ ] `DATABASE_URL` is set in `backend/.env`
- [ ] Certificate downloaded (if using certificate)
- [ ] IP address whitelisted in CockroachDB Cloud
- [ ] `npm run migrate` completes successfully
- [ ] Tables visible in CockroachDB Cloud console
- [ ] Backend services start without database errors

## Resources

- [CockroachDB Setup Guide](./COCKROACHDB_SETUP.md)
- [Get Credentials Guide](./GET_COCKROACHDB_CREDENTIALS.md)
- [CockroachDB Cloud Console](https://cockroachlabs.cloud)
