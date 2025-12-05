# Switching from Supabase to CockroachDB

## Your CockroachDB Connection String

```
postgresql://will:5UVtZ9CPRR1YIhxWXDCKkQ@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

## Step-by-Step Migration

### Step 1: Update `backend/.env`

Replace your Supabase connection string with the CockroachDB one:

```env
DATABASE_URL=postgresql://will:5UVtZ9CPRR1YIhxWXDCKkQ@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

**Note**: We'll change `/defaultdb` to `/uaol` after creating the database.

### Step 2: Create `uaol` Database

In CockroachDB Cloud SQL Shell, run:
```sql
CREATE DATABASE uaol;
```

### Step 3: Update Connection String to Use `uaol`

Update `backend/.env` to use the `uaol` database:
```env
DATABASE_URL=postgresql://will:5UVtZ9CPRR1YIhxWXDCKkQ@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/uaol?sslmode=verify-full
```

### Step 4: Run Migrations

```powershell
cd backend
npm run migrate
```

### Step 5: Verify Tables

In CockroachDB Cloud SQL Shell:
```sql
USE uaol;
SHOW TABLES;
```

You should see:
- `users`
- `mcp_tools`
- `processing_jobs`
- `files`
- `credits_transactions`
- `tool_executions`

## SSL Certificate (if needed)

If you get SSL errors, you may need to download the certificate:

```powershell
# Download certificate
mkdir -p $env:appdata\postgresql\
Invoke-WebRequest -Uri https://cockroachlabs.cloud/clusters/[YOUR_CLUSTER_ID]/cert -OutFile $env:appdata\postgresql\root.crt
```

Then update connection string:
```env
DATABASE_URL=postgresql://will:5UVtZ9CPRR1YIhxWXDCKkQ@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/uaol?sslmode=verify-full&sslrootcert=%APPDATA%\postgresql\root.crt
```

## Quick Checklist

- [ ] Update `backend/.env` with CockroachDB connection string
- [ ] Create `uaol` database in CockroachDB SQL Shell
- [ ] Update connection string to use `/uaol` instead of `/defaultdb`
- [ ] Run `npm run migrate` from `backend/` directory
- [ ] Verify tables exist: `USE uaol; SHOW TABLES;`
- [ ] Restart services: `npm run dev`

## Troubleshooting

### SSL Certificate Error

If you see SSL errors:
1. Download certificate (see above)
2. Add `&sslrootcert=%APPDATA%\postgresql\root.crt` to connection string
3. Or use `sslmode=require` instead of `verify-full` (less secure but simpler)

### Connection Refused

1. Check IP whitelist in CockroachDB Cloud console
2. Add your current IP address
3. Wait 1-2 minutes for changes to propagate

### Database Doesn't Exist

Make sure you:
1. Created the database: `CREATE DATABASE uaol;`
2. Updated connection string to use `/uaol`
3. Verified with: `SHOW DATABASES;`

---

**Ready to switch?** Follow the steps above!
