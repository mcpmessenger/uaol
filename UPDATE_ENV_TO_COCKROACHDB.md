# Update .env to Use CockroachDB

## Current Issue

Your migrations are still connecting to **Supabase** instead of **CockroachDB**. You need to update `backend/.env`.

## Your CockroachDB Connection String

```
postgresql://will:5UVtZ9CPRR1YIhxWXDCKkQ@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/uaol?sslmode=verify-full
```

**Note**: Changed `/defaultdb` to `/uaol` since you've created the `uaol` database.

## Step 1: Update `backend/.env`

Open `backend/.env` and find the `DATABASE_URL` line. Replace it with:

```env
DATABASE_URL=postgresql://will:5UVtZ9CPRR1YIhxWXDCKkQ@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/uaol?sslmode=verify-full
```

## Step 2: Handle SSL Certificate (if needed)

If you get SSL certificate errors, you have two options:

### Option A: Download Certificate (Recommended)

```powershell
# Create directory
mkdir -p $env:appdata\postgresql\

# Download certificate (replace CLUSTER_ID with your cluster ID from the URL)
# Your cluster ID appears to be: 88af7680-8ba8-4039-9bd0-8124e15a3ee7 (from earlier)
Invoke-WebRequest -Uri https://cockroachlabs.cloud/clusters/88af7680-8ba8-4039-9bd0-8124e15a3ee7/cert -OutFile $env:appdata\postgresql\root.crt
```

Then update connection string:
```env
DATABASE_URL=postgresql://will:5UVtZ9CPRR1YIhxWXDCKkQ@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/uaol?sslmode=verify-full&sslrootcert=%APPDATA%\postgresql\root.crt
```

### Option B: Use `sslmode=require` (Simpler, Less Secure)

Change `sslmode=verify-full` to `sslmode=require`:
```env
DATABASE_URL=postgresql://will:5UVtZ9CPRR1YIhxWXDCKkQ@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/uaol?sslmode=require
```

## Step 3: Verify Connection String

```powershell
Get-Content backend\.env | Select-String "DATABASE_URL"
```

Should show the CockroachDB URL (not Supabase).

## Step 4: Run Migrations

```powershell
cd backend
npm run migrate
```

**Expected Output:**
```
[DB Connection] Creating pool with CockroachDB URL: postgresql://will:****@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/uaol...
[DB Connection] ✅ Database connection established
[info] Database migrations completed successfully
```

## Step 5: Verify Tables in CockroachDB

In CockroachDB Cloud SQL Shell:
```sql
USE uaol;
SHOW TABLES;
```

You should see all your tables.

## Troubleshooting

### SSL Certificate Error

If you see: `certificate verify failed`

**Solution**: Use Option A (download certificate) or Option B (use `sslmode=require`)

### Connection Refused

1. Check IP whitelist in CockroachDB Cloud console
2. Add your current IP address
3. Wait 1-2 minutes

### Still Connecting to Supabase

1. Make sure you saved `backend/.env`
2. Check the file actually has the CockroachDB URL
3. Restart your terminal/PowerShell
4. Run migrations again

---

**After updating `.env`, run `npm run migrate` again!**

