# Migration Guide: Supabase to CockroachDB

This guide walks you through migrating your UAOL database from Supabase to CockroachDB.

## Why Migrate to CockroachDB?

CockroachDB is a cloud-native, distributed SQL database built for global scale and resilience. It is the **primary recommendation** for UAOL production deployments.

- ✅ **Operational Simplicity**: Self-healing and requires minimal operational overhead, which is a significant advantage for a microservices team focused on feature development
- ✅ **Strong Consistency**: Serializable isolation - the highest level of transactional consistency, which is paramount for the Billing Service
- ✅ **High Availability**: Automatic replication across nodes and zones, providing built-in fault tolerance and instant recovery from node failures
- ✅ **PostgreSQL Wire-Protocol Compatibility**: Compatible with the PostgreSQL wire protocol and most SQL syntax, making the transition from Supabase straightforward

## Prerequisites

1. Access to your current Supabase database
2. A CockroachDB Cloud account (or local CockroachDB instance)
3. `pg_dump` and `psql` installed (or use Docker)

## Migration Steps

### Step 1: Export Data from Supabase

Export your current database schema and data:

```powershell
# Export schema and data
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > supabase_backup.sql

# Or export only data (if schema is already migrated)
pg_dump --data-only "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > supabase_data.sql
```

### Step 2: Set Up CockroachDB

#### Option A: CockroachDB Cloud (Recommended)

1. Go to [cockroachlabs.cloud](https://cockroachlabs.cloud)
2. Create a new cluster
3. Get your connection string from the **Connect** button
4. Note: CockroachDB Cloud requires SSL (`?sslmode=require`)

#### Option B: Local CockroachDB

```powershell
# Using Docker
docker run -d `
  --name uaol-cockroachdb `
  -p 26257:26257 `
  -p 8080:8080 `
  cockroachdb/cockroach:latest start-single-node --insecure

# Initialize cluster
docker exec -it uaol-cockroachdb ./cockroach init --insecure

# Create database
docker exec -it uaol-cockroachdb ./cockroach sql --insecure -e "CREATE DATABASE uaol;"
```

### Step 3: Download Certificate (Recommended for CockroachDB Cloud)

For enhanced security with CockroachDB Cloud, download your cluster's root certificate:

**Windows (PowerShell):**
```powershell
mkdir -p $env:appdata\postgresql\
Invoke-WebRequest -Uri https://cockroachlabs.cloud/clusters/[CLUSTER_ID]/cert -OutFile $env:appdata\postgresql\root.crt
```

**macOS/Linux:**
```bash
mkdir -p ~/.postgresql
curl https://cockroachlabs.cloud/clusters/[CLUSTER_ID]/cert -o ~/.postgresql/root.crt
```

Replace `[CLUSTER_ID]` with your cluster ID from the CockroachDB Cloud console.

### Step 4: Update Connection String

Update your `.env` file:

```env
# CockroachDB Cloud (with certificate - recommended)
# Windows:
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/uaol?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt
# macOS/Linux:
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/uaol?sslmode=require&sslrootcert=$HOME/.postgresql/root.crt

# CockroachDB Cloud (without certificate - simpler but less secure)
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/uaol?sslmode=require

# Local CockroachDB
DATABASE_URL=postgresql://root@localhost:26257/uaol?sslmode=disable
```

### Step 5: Run Schema Migration

The schema is already CockroachDB-compatible. Run migrations:

```powershell
cd backend
npm run migrate
```

This will:
- Create all tables with CockroachDB-compatible syntax
- Set up indexes
- Create triggers
- Use `gen_random_uuid()` for UUID generation (works in both PostgreSQL and CockroachDB)

### Step 6: Import Data (Optional)

If you have existing data to migrate:

```powershell
# Import data (you may need to edit the SQL file for CockroachDB compatibility)
psql "postgresql://root@localhost:26257/uaol?sslmode=disable" < supabase_data.sql
```

**Note**: You may need to:
- Remove `CREATE EXTENSION` statements (CockroachDB doesn't use extensions)
- Replace `uuid_generate_v4()` with `gen_random_uuid()` if present
- Adjust any PostgreSQL-specific syntax

### Step 7: Verify Migration

1. **Check tables exist**:
   ```sql
   SHOW TABLES;
   ```

2. **Verify data**:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM mcp_tools;
   SELECT COUNT(*) FROM processing_jobs;
   ```

3. **Test application**:
   ```powershell
   npm run dev
   ```

4. **Access CockroachDB Console**:
   - Local: http://localhost:8080
   - Cloud: Available in CockroachDB Cloud dashboard

## Schema Compatibility Notes

### UUID Generation

- **Supabase/PostgreSQL**: Uses `uuid-ossp` extension with `uuid_generate_v4()`
- **CockroachDB**: Uses built-in `gen_random_uuid()`
- **Our Schema**: Uses `gen_random_uuid()` which works in both (PostgreSQL 13+)

### Extensions

- CockroachDB doesn't support PostgreSQL extensions like `uuid-ossp`
- Our schema handles this gracefully with a `DO` block that fails silently

### Data Types

All data types used are compatible:
- ✅ `UUID`
- ✅ `TEXT`
- ✅ `BIGINT`
- ✅ `INTEGER`
- ✅ `TIMESTAMP WITH TIME ZONE`
- ✅ `JSONB`

### Constraints

All constraints work identically:
- ✅ `PRIMARY KEY`
- ✅ `UNIQUE`
- ✅ `CHECK` constraints
- ✅ `FOREIGN KEY` references
- ✅ `ON DELETE CASCADE`

## Rollback Plan

If you need to rollback to Supabase:

1. Keep your Supabase connection string in `.env.backup`
2. Export data from CockroachDB:
   ```powershell
   pg_dump "your-cockroachdb-connection-string" > cockroachdb_backup.sql
   ```
3. Restore to Supabase:
   ```powershell
   psql "your-supabase-connection-string" < cockroachdb_backup.sql
   ```

## Troubleshooting

### SSL Connection Errors

**Error**: `SSL connection required`

**Solution**: Add `?sslmode=require` to your CockroachDB Cloud connection string:
```
DATABASE_URL=postgresql://...?sslmode=require
```

**Error**: `certificate verify failed` or SSL certificate issues

**Solution**: Download and use the cluster's root certificate:
1. Download certificate from CockroachDB Cloud console
2. Update connection string to include certificate path:
   - Windows: `&sslrootcert=%APPDATA%\postgresql\root.crt`
   - macOS/Linux: `&sslrootcert=$HOME/.postgresql/root.crt`

### UUID Generation Errors

**Error**: `function uuid_generate_v4() does not exist`

**Solution**: The schema already uses `gen_random_uuid()`. If you see this error, ensure you've run the latest migrations:
```powershell
npm run migrate
```

### Extension Errors

**Error**: `extension "uuid-ossp" does not exist`

**Solution**: This is expected in CockroachDB. The schema handles this gracefully. If you see this error during data import, remove `CREATE EXTENSION` statements from your SQL file.

### Connection Timeout

**Error**: Connection timeout to CockroachDB Cloud

**Solution**:
1. Verify your IP is whitelisted in CockroachDB Cloud
2. Check the host and port (default: 26257)
3. Ensure SSL is properly configured

## Performance Considerations

### Single Node vs Multi-Node

- **Local Development**: Single-node CockroachDB is fine
- **Production**: Use CockroachDB Cloud's multi-node clusters for high availability

### Connection Pooling

CockroachDB Cloud includes built-in connection pooling. Your existing connection pool settings in `config/index.ts` will work fine.

### Indexes

All indexes from the original schema are compatible and will be created automatically during migration.

## Next Steps

After successful migration:

1. ✅ Update all environment variables
2. ✅ Test all API endpoints
3. ✅ Verify billing transactions (critical for consistency)
4. ✅ Monitor CockroachDB Cloud metrics
5. ✅ Set up backups (automatic in CockroachDB Cloud)

## Resources

- [CockroachDB Documentation](https://www.cockroachlabs.com/docs/)
- [PostgreSQL to CockroachDB Migration](https://www.cockroachlabs.com/docs/stable/migrate-from-postgres.html)
- [CockroachDB Cloud](https://cockroachlabs.cloud)
