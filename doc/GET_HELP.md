# Getting Help with UAOL

## 🆘 Where to Get Help

### Primary Support Channel: GitHub Issues

**The best way to get help is to open an issue on GitHub:**

1. Go to: https://github.com/mcpmessenger/uaol/issues
2. Click **"New Issue"**
3. Choose the appropriate template (if available) or describe your problem
4. Include:
   - What you're trying to do
   - What error messages you're seeing
   - Steps to reproduce
   - Your environment (OS, Node.js version, etc.)

### Quick Help Resources

Before opening an issue, check these guides:

- **Database Issues**: See [CockroachDB Troubleshooting](#cockroachdb-specific-help) below
- **Connection Problems**: [backend/TROUBLESHOOTING.md](backend/TROUBLESHOOTING.md)
- **Setup Issues**: [backend/QUICKSTART.md](backend/QUICKSTART.md)
- **Frontend Issues**: [FRONTEND_SETUP.md](FRONTEND_SETUP.md)

## 🐛 Reporting Bugs

If you find a bug:
1. **Open a GitHub Issue** describing the bug
2. **Include steps to reproduce** and error messages
3. **Optionally**: Submit a Pull Request with a fix

## 🗄️ CockroachDB-Specific Help

### Common CockroachDB Issues

#### 1. Connection Refused / Timeout

**Symptoms:**
- `ECONNREFUSED` errors
- Connection timeout errors
- Services can't connect to database

**Solutions:**

**A. Check IP Whitelist (CockroachDB Cloud)**
1. Go to [CockroachDB Cloud Console](https://cockroachlabs.cloud)
2. Click your cluster → **"Networking"** or **"IP Allowlist"**
3. Add your current IP address
4. Wait 1-2 minutes for changes to propagate

**B. Verify Connection String**
```powershell
# Check your DATABASE_URL in backend/.env
# Should look like:
# postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require
```

**C. Test Connection Manually**
```powershell
cd backend
node test-connection.js
# Or use the test script from TEST_COCKROACHDB_CONNECTION.md
```

#### 2. SSL Certificate Errors

**Symptoms:**
- `certificate verify failed`
- `SSL connection required`

**Solutions:**

**A. Download Certificate**
```powershell
# Create directory
mkdir -p $env:appdata\postgresql\

# Download certificate (replace CLUSTER_ID with your cluster ID)
Invoke-WebRequest -Uri https://cockroachlabs.cloud/clusters/[CLUSTER_ID]/cert -OutFile $env:appdata\postgresql\root.crt
```

**B. Update Connection String**
```env
# Add certificate path to connection string
DATABASE_URL=postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt
```

**C. For Local Development (Insecure)**
```env
# Only use for local Docker CockroachDB
DATABASE_URL=postgresql://root@localhost:26257/uaol?sslmode=disable
```

#### 3. Authentication Failed

**Symptoms:**
- `password authentication failed`
- `user does not exist`

**Solutions:**

**A. Verify Credentials**
1. Go to CockroachDB Cloud Console
2. Click **"Connect"** → **"Connection string"**
3. Copy the exact connection string
4. Make sure password is URL-encoded if it has special characters:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - `&` → `%26`
   - `?` → `%3F`

**B. Regenerate Connection String**
1. In CockroachDB Cloud, go to your cluster
2. Click **"Connect"** → **"Connection string"**
3. Copy the new connection string
4. Update `backend/.env` with the new string

#### 4. Database Doesn't Exist

**Symptoms:**
- `database "uaol" does not exist`
- Migration fails

**Solutions:**

**A. Create Database**
```sql
-- Connect to CockroachDB (via console or psql)
CREATE DATABASE uaol;
```

**B. Or Use Default Database**
```env
# Use 'defaultdb' instead of 'uaol'
DATABASE_URL=postgresql://[user]:[password]@[host]:26257/defaultdb?sslmode=require
```

#### 5. Services Still Connecting to Localhost

**Symptoms:**
- Services show `localhost:5432` in logs
- `DATABASE_URL` is set but not being used

**Solutions:**

**A. Verify .env File Location**
- Must be at: `backend/.env` (not project root)
- Check file exists: `Test-Path backend\.env`

**B. Check .env Format**
```env
# No quotes needed
DATABASE_URL=postgresql://user:password@host:26257/database?sslmode=require

# NOT like this:
# DATABASE_URL="postgresql://..."
```

**C. Restart Services**
```powershell
# Stop all services (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

**D. Check Service Logs**
Look for:
- `[DB Connection]` logs showing connection string
- `process.env.DATABASE_URL: SET` or `NOT SET`

### Getting Help with CockroachDB

If you've tried the above and still have issues:

1. **Gather Information:**
   ```powershell
   # Check your connection string (hide password)
   $env:DATABASE_URL -replace ':[^:@]+@', ':****@'
   
   # Check if certificate exists
   Test-Path $env:appdata\postgresql\root.crt
   
   # Test connection
   cd backend
   npm run migrate
   ```

2. **Open GitHub Issue:**
   - Title: `[CockroachDB] [Brief description of issue]`
   - Include:
     - Error messages (full stack trace)
     - Your connection string format (hide password)
     - Whether you're using Cloud or Local
     - Steps you've already tried
     - OS and Node.js version

3. **Check Existing Issues:**
   - Search: https://github.com/mcpmessenger/uaol/issues?q=is%3Aissue+cockroachdb
   - See if someone else had the same problem

## 📚 Additional Resources

### Documentation
- [CockroachDB Setup Guide](backend/COCKROACHDB_SETUP.md)
- [Test Connection Guide](backend/TEST_COCKROACHDB_CONNECTION.md)
- [Get Credentials Guide](backend/GET_COCKROACHDB_CREDENTIALS.md)
- [Database Setup Guide](backend/DATABASE_SETUP.md)
- [Troubleshooting Guide](backend/TROUBLESHOOTING.md)

### External Resources
- [CockroachDB Documentation](https://www.cockroachlabs.com/docs/)
- [CockroachDB Cloud Console](https://cockroachlabs.cloud)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

### Community
- [CockroachDB Community Forum](https://forum.cockroachlabs.com/)
- [CockroachDB Slack](https://cockroachlabs.slack.com/)

## 🎯 Quick Checklist Before Asking for Help

- [ ] Checked all troubleshooting guides
- [ ] Verified `DATABASE_URL` is set correctly in `backend/.env`
- [ ] Tested connection with `npm run migrate`
- [ ] Checked IP is whitelisted (for Cloud)
- [ ] Verified certificate is downloaded (if using certificate)
- [ ] Checked GitHub Issues for similar problems
- [ ] Included error messages and steps to reproduce

## 💡 Tips for Getting Faster Help

1. **Be Specific**: Include exact error messages, not just "it doesn't work"
2. **Show What You Tried**: List the troubleshooting steps you've already attempted
3. **Include Environment**: OS, Node.js version, database type (Cloud/Local)
4. **Provide Logs**: Include relevant log output (hide sensitive info like passwords)
5. **Use Code Blocks**: Format code/commands properly in your issue

---

**Remember**: Most issues are configuration-related. Double-check your connection string, IP whitelist, and certificate setup before opening an issue!
