# How to Get CockroachDB Cloud Credentials

## Quick Answer

**DATABASE_URL goes in the BACKEND `.env` file** (not frontend). The frontend never connects directly to the database - it only connects to your backend API.

## Step-by-Step: Getting Your CockroachDB Cloud Credentials

### 1. Log into CockroachDB Cloud

1. Go to [https://cockroachlabs.cloud](https://cockroachlabs.cloud)
2. Sign in to your account

### 2. Select Your Cluster

1. Click on your cluster from the dashboard
2. You should see your cluster details

### 3. Get Connection String (Easiest Method)

1. Click the **"Connect"** button (usually in the top right or cluster details page)
2. You'll see several connection options:
   - **Connection string** (recommended)
   - **Parameters** (individual values)
   - **Command line**

3. **Select "Connection string" tab**
4. You'll see a connection string like:
   ```
   postgresql://username:password@host:26257/database?sslmode=require
   ```

5. **Copy this entire string** - it contains:
   - Username
   - Password
   - Host
   - Database name
   - SSL settings

### 4. Alternative: Get Individual Credentials

If you need individual values:

1. Click **"Connect"** → **"Parameters"** tab
2. You'll see:
   - **Username**: Usually something like `your-username` or `root`
   - **Password**: Your database password (if you set one)
   - **Host**: Something like `your-cluster.xxxxx.cockroachlabs.cloud`
   - **Port**: `26257`
   - **Database**: Usually `defaultdb` or the database name you created

### 5. Create Database User (If Needed)

If you need to create a new user:

1. Go to **SQL Shell** in CockroachDB Cloud console
2. Run:
   ```sql
   CREATE USER your_username WITH PASSWORD 'your_secure_password';
   GRANT ALL ON DATABASE your_database TO your_username;
   ```

### 6. Update Your Backend .env File

**Location**: `backend/.env` (NOT in the frontend folder)

```env
# Option 1: Using the full connection string from CockroachDB Cloud
DATABASE_URL=postgresql://username:password@host:26257/database?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt

# Option 2: If you have individual values, construct it:
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt
```

**Important Notes:**
- Replace `[username]`, `[password]`, `[host]`, and `[database]` with your actual values
- If your password contains special characters, you may need to URL-encode them:
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `$` becomes `%24`
  - `%` becomes `%25`
  - `&` becomes `%26`
  - `?` becomes `%3F`
  - `/` becomes `%2F`
  - `:` becomes `%3A`
  - `=` becomes `%3D`

## Example

If CockroachDB Cloud gives you:
- Username: `myuser`
- Password: `MyP@ssw0rd!`
- Host: `my-cluster.abc123.cockroachlabs.cloud`
- Database: `defaultdb`

Your connection string would be:
```env
DATABASE_URL=postgresql://myuser:MyP%40ssw0rd%21@my-cluster.abc123.cockroachlabs.cloud:26257/defaultdb?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt
```

Note: `@` became `%40` and `!` became `%21` in the password.

## Frontend Configuration

The frontend does NOT need `DATABASE_URL`. It only needs:

**Location**: `.env` in the project root (not in `backend/`)

```env
VITE_API_BASE_URL=http://localhost:3000
```

This tells the frontend where to find your backend API. The frontend never connects directly to the database.

## Verify Your Connection

After setting up your `.env` file:

```powershell
cd backend
npm run migrate
```

This will test your database connection and create the necessary tables.

## Troubleshooting

### "Password authentication failed"
- Double-check your username and password
- Make sure special characters in the password are URL-encoded
- Verify the user exists in CockroachDB Cloud

### "Connection refused" or "Connection timeout"
- Check that your IP address is whitelisted in CockroachDB Cloud
- Go to **Networking** in your cluster settings
- Add your current IP address to the allowed list

### "SSL connection required"
- Make sure `?sslmode=require` is in your connection string
- If using a certificate, verify the path is correct

## Security Best Practices

1. **Never commit `.env` files to git** - they're already in `.gitignore`
2. **Use strong passwords** - CockroachDB Cloud enforces this
3. **Use certificates** - Download and use the root certificate for additional security
4. **Rotate credentials regularly** - Especially in production
5. **Use separate users** - Create different database users for different services if needed

## Resources

- [CockroachDB Cloud Console](https://cockroachlabs.cloud)
- [Connection String Documentation](https://www.cockroachlabs.com/docs/stable/connect-to-the-database.html)
- [CockroachDB Setup Guide](./COCKROACHDB_SETUP.md)
