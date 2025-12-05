# Quick Help: CockroachDB Not Working

## 🚨 Most Common Issues & Quick Fixes

### Issue 1: "Connection Refused" or "Connection Timeout"

**Quick Fix:**
1. **Check IP Whitelist** (CockroachDB Cloud only)
   - Go to: https://cockroachlabs.cloud
   - Click your cluster → **"Networking"** → **"IP Allowlist"**
   - Add your current IP address
   - Wait 1-2 minutes

2. **Verify Connection String**
   ```powershell
   # Check backend/.env file
   # Should have:
   DATABASE_URL=postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require
   ```

### Issue 2: "SSL Certificate Error"

**Quick Fix:**
```powershell
# Download certificate
mkdir -p $env:appdata\postgresql\
Invoke-WebRequest -Uri https://cockroachlabs.cloud/clusters/[YOUR_CLUSTER_ID]/cert -OutFile $env:appdata\postgresql\root.crt

# Update .env to include certificate path
DATABASE_URL=postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt
```

### Issue 3: "Password Authentication Failed"

**Quick Fix:**
1. Go to CockroachDB Cloud Console
2. Click **"Connect"** → **"Connection string"**
3. Copy the **exact** connection string
4. Paste into `backend/.env` as `DATABASE_URL=...`
5. **Important**: If password has special characters, they may need URL encoding

### Issue 4: Services Still Using Localhost

**Note**: This issue has been fixed in the latest code. If you're still experiencing it, make sure you have the latest version.

**Quick Fix:**
```powershell
# 1. Verify .env file exists
Test-Path backend\.env

# 2. Check DATABASE_URL is set (hide password)
$env:DATABASE_URL -replace ':[^:@]+@', ':****@'

# 3. Restart services
cd backend
# Stop current services (Ctrl+C)
npm run dev
```

**If still having issues**, check the logs for:
- `[DB Connection] ⚡ MODULE STARTING` should appear AFTER `.env loaded successfully`
- `[DB Connection] process.env.DATABASE_URL: SET` (not "NOT SET")
- `[DB Connection] Creating pool with Supabase URL: ...` (not localhost)

See [DATABASE_CONNECTION_FIX_COMPLETE.md](DATABASE_CONNECTION_FIX_COMPLETE.md) for details on the fix.

## 🧪 Test Your Connection

```powershell
cd backend
npm run migrate
```

**Success looks like:**
```
[info] Starting database migrations...
[info] Connecting to database...
[info] Database migrations completed successfully
```

**If it fails**, see the error message and check the troubleshooting section below.

## 📋 Step-by-Step Setup Checklist

### For CockroachDB Cloud:

- [ ] Created CockroachDB Cloud account
- [ ] Created a cluster (free tier available)
- [ ] Got connection string from cluster → Connect → Connection string
- [ ] Added IP address to whitelist (Networking → IP Allowlist)
- [ ] Downloaded certificate (optional but recommended)
- [ ] Set `DATABASE_URL` in `backend/.env`
- [ ] Ran `npm run migrate` successfully
- [ ] Verified tables exist in CockroachDB console

### For Local CockroachDB (Docker):

- [ ] Started CockroachDB: `docker-compose up -d cockroachdb`
- [ ] Initialized cluster: `docker-compose exec cockroachdb ./cockroach init --insecure`
- [ ] Set `DATABASE_URL=postgresql://root@localhost:26257/uaol?sslmode=disable` in `backend/.env`
- [ ] Ran `npm run migrate` successfully

## 🔍 Detailed Troubleshooting

### Check Your Connection String Format

**CockroachDB Cloud (with certificate):**
```
postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt
```

**CockroachDB Cloud (without certificate):**
```
postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require
```

**Local CockroachDB (Docker):**
```
postgresql://root@localhost:26257/uaol?sslmode=disable
```

### Verify Certificate Location

```powershell
# Check if certificate exists
Test-Path $env:appdata\postgresql\root.crt

# Should return: True
# If False, download it again (see Issue 2 above)
```

### Test Connection Manually

Create `backend/test-connection.js`:
```javascript
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

async function test() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Testing connection...');
    const result = await pool.query('SELECT NOW(), version()');
    console.log('✅ SUCCESS!');
    console.log('Time:', result.rows[0].now);
    console.log('Version:', result.rows[0].version);
    await pool.end();
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

test();
```

Run it:
```powershell
cd backend
node test-connection.js
```

## 🆘 Still Not Working?

### Get Your Cluster ID

1. Go to CockroachDB Cloud Console
2. Click your cluster
3. The cluster ID is in the URL: `https://cockroachlabs.cloud/clusters/[CLUSTER_ID]/...`
4. Or in the cluster details page

### Open a GitHub Issue

Go to: https://github.com/mcpmessenger/uaol/issues/new

**Include:**
- Error message (full text)
- Your connection string format (hide password): `postgresql://user:****@host:26257/db`
- Whether using Cloud or Local
- Certificate path (if using): `%APPDATA%\postgresql\root.crt`
- What you've tried so far
- OS and Node.js version

**Example Issue Title:**
```
[CockroachDB] Connection timeout - IP whitelisted, certificate downloaded
```

## 📚 More Help

- **Full Setup Guide**: [backend/COCKROACHDB_SETUP.md](backend/COCKROACHDB_SETUP.md)
- **Test Connection Guide**: [backend/TEST_COCKROACHDB_CONNECTION.md](backend/TEST_COCKROACHDB_CONNECTION.md)
- **Get Credentials**: [backend/GET_COCKROACHDB_CREDENTIALS.md](backend/GET_COCKROACHDB_CREDENTIALS.md)
- **General Help**: [GET_HELP.md](GET_HELP.md)

## ✅ Success Indicators

You'll know CockroachDB is working when:

1. ✅ `npm run migrate` completes without errors
2. ✅ You can see tables in CockroachDB Cloud console: `SHOW TABLES;`
3. ✅ Backend services start without database connection errors
4. ✅ You see `[DB Connection] ✅ Database connection established` in logs
5. ✅ You see `[DB Connection] Creating pool with Supabase URL: ...` (or CockroachDB URL) - NOT localhost
6. ✅ API calls work (chat, auth, etc.)

**Note**: The database connection race condition has been fixed. All services should now connect correctly. If you see `localhost` in connection logs, ensure you have the latest code version.

---

**Remember**: Most issues are:
- IP not whitelisted (Cloud)
- Wrong connection string format
- Certificate path incorrect
- `.env` file in wrong location or not loaded

Double-check these first!
