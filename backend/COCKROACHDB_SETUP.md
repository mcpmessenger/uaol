# CockroachDB Setup Guide

## Why CockroachDB?

CockroachDB is a cloud-native, distributed SQL database built for global scale and resilience. It is the **primary recommendation** for UAOL production deployments because:

- ✅ **Operational Simplicity**: Self-healing and requires minimal operational overhead, which is a significant advantage for a microservices team focused on feature development
- ✅ **Strong Consistency**: Serializable isolation - the highest level of transactional consistency, which is paramount for the Billing Service
- ✅ **High Availability**: Automatic replication across nodes and zones, providing built-in fault tolerance and instant recovery from node failures
- ✅ **PostgreSQL Wire-Protocol Compatibility**: Compatible with the PostgreSQL wire protocol and most SQL syntax, making the transition from Supabase straightforward
- ✅ **Global Scale**: Built for distributed, cloud-native deployments

## Setup Options

### Option 1: CockroachDB Cloud (Recommended for Production)

CockroachDB Cloud offers a fully managed service with a generous free tier.

#### 1. Create a CockroachDB Cloud Account

1. Go to [cockroachlabs.cloud](https://cockroachlabs.cloud)
2. Sign up for a free account
3. Create a new cluster (free tier available)

#### 2. Get Your Connection String

1. In the CockroachDB Cloud console, go to your cluster
2. Click **Connect** button
3. Select **Connection string** tab
4. Copy the connection string (format):
   ```
   postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require
   ```

#### 3. Download the Root Certificate (Recommended)

For enhanced security, download your cluster's root certificate:

**Windows (PowerShell):**
```powershell
# Create PostgreSQL certificate directory if it doesn't exist
mkdir -p $env:appdata\postgresql\

# Download certificate (replace CLUSTER_ID with your cluster ID)
Invoke-WebRequest -Uri https://cockroachlabs.cloud/clusters/[CLUSTER_ID]/cert -OutFile $env:appdata\postgresql\root.crt
```

**macOS/Linux:**
```bash
# Create directory
mkdir -p ~/.postgresql

# Download certificate (replace CLUSTER_ID with your cluster ID)
curl https://cockroachlabs.cloud/clusters/[CLUSTER_ID]/cert -o ~/.postgresql/root.crt
```

**Note**: You can find your cluster ID in the CockroachDB Cloud console URL or in the cluster details.

#### 4. Update Your .env File

**Option A: Using Certificate (Recommended for Production)**
```env
# Windows
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt

# macOS/Linux
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=$HOME/.postgresql/root.crt
```

**Option B: Without Certificate (Simpler, but less secure)**
```env
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require
```

**Note**: CockroachDB Cloud requires SSL, so `?sslmode=require` is mandatory. Using a certificate provides additional security by verifying the server's identity.

#### 4. Run Migrations

```powershell
cd backend
npm run migrate
```

### Option 2: Local CockroachDB (Development)

For local development, you can run CockroachDB using Docker.

#### Using Docker Compose

The `docker-compose.yml` includes a CockroachDB service. To use it:

1. **Update docker-compose.yml** to use CockroachDB instead of PostgreSQL (or run both)
2. **Start CockroachDB**:
   ```powershell
   docker-compose up -d cockroachdb
   ```

3. **Initialize the cluster** (first time only):
   ```powershell
   docker-compose exec cockroachdb ./cockroach init --insecure
   ```

4. **Update .env**:
   ```env
   DATABASE_URL=postgresql://root@localhost:26257/defaultdb?sslmode=disable
   ```

5. **Run migrations**:
   ```powershell
   npm run migrate
   ```

#### Manual Docker Setup

```powershell
# Start CockroachDB container
docker run -d `
  --name uaol-cockroachdb `
  -p 26257:26257 `
  -p 8080:8080 `
  cockroachdb/cockroach:latest start-single-node --insecure

# Initialize cluster (first time only)
docker exec -it uaol-cockroachdb ./cockroach init --insecure

# Create database
docker exec -it uaol-cockroachdb ./cockroach sql --insecure -e "CREATE DATABASE uaol;"
```

Then in `.env`:
```env
DATABASE_URL=postgresql://root@localhost:26257/uaol?sslmode=disable
```

### Option 3: Self-Hosted CockroachDB

For production self-hosted deployments, see the [CockroachDB Deployment Guide](https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-on-premises.html).

## Migration from Supabase

Since CockroachDB is PostgreSQL wire-protocol compatible, migration is straightforward:

### 1. Export Data from Supabase

```powershell
# Using pg_dump
pg_dump "your-supabase-connection-string" > supabase_backup.sql
```

### 2. Create CockroachDB Cluster

Follow Option 1 or 2 above to set up your CockroachDB instance.

### 3. Import Schema

The schema is already CockroachDB-compatible. Just run:

```powershell
npm run migrate
```

### 4. Import Data (if needed)

```powershell
# Note: You may need to adjust the SQL file for CockroachDB-specific syntax
psql "your-cockroachdb-connection-string" < supabase_backup.sql
```

## Connection String Formats

### CockroachDB Cloud (Without Certificate)
```
postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require
```

### CockroachDB Cloud (With Certificate - Recommended)
```
# Windows
postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt

# macOS/Linux
postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=$HOME/.postgresql/root.crt
```

### Local CockroachDB (Insecure)
```
postgresql://root@localhost:26257/uaol?sslmode=disable
```

### Local CockroachDB (Secure)
```
postgresql://[username]:[password]@localhost:26257/uaol?sslmode=require&sslrootcert=/path/to/ca.crt
```

## CockroachDB-Specific Features

### Serializable Isolation

CockroachDB uses **serializable isolation** by default, which is the strongest isolation level. This is perfect for the Billing Service where consistency is critical.

### UUID Generation

CockroachDB uses `gen_random_uuid()` instead of PostgreSQL's `uuid-ossp` extension. Our schema is already compatible with both.

### Time Zones

CockroachDB handles `TIMESTAMP WITH TIME ZONE` the same way as PostgreSQL, so no changes needed.

## Troubleshooting

### SSL Connection Required

If you see SSL errors with CockroachDB Cloud:
- Ensure `?sslmode=require` is in your connection string
- For local development, use `?sslmode=disable` (insecure mode)
- If using a certificate, verify the path is correct:
  - Windows: `%APPDATA%\postgresql\root.crt` (typically `C:\Users\YourName\AppData\Roaming\postgresql\root.crt`)
  - macOS/Linux: `$HOME/.postgresql/root.crt` (typically `~/.postgresql/root.crt`)
- Ensure the certificate file was downloaded correctly from CockroachDB Cloud console

### Connection Timeout

- Check that your CockroachDB cluster is running
- Verify the host and port (default: 26257)
- For CockroachDB Cloud, ensure your IP is whitelisted

### Migration Errors

If migrations fail:
- Ensure you're using the latest schema (already CockroachDB-compatible)
- Check that the database exists: `CREATE DATABASE uaol;`
- Verify connection string format

### Performance

CockroachDB is optimized for distributed workloads. For single-node local development, PostgreSQL might be faster, but CockroachDB provides better production characteristics.

## CockroachDB Console

Access the built-in admin UI:

- **Local**: http://localhost:8080
- **Cloud**: Available in CockroachDB Cloud dashboard

## Next Steps

1. ✅ Set up CockroachDB (Cloud or Local)
2. ✅ Update `DATABASE_URL` in `.env`
3. ✅ Run `npm run migrate`
4. ✅ Verify tables in CockroachDB console
5. ✅ Test your application

## Resources

- [CockroachDB Documentation](https://www.cockroachlabs.com/docs/)
- [CockroachDB Cloud](https://cockroachlabs.cloud)
- [PostgreSQL Compatibility](https://www.cockroachlabs.com/docs/stable/postgresql-compatibility.html)
- [Migration Guide](https://www.cockroachlabs.com/docs/stable/migrate-from-postgres.html)
