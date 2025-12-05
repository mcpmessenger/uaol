# CockroachDB CLI and SDK Guide

## Overview

CockroachDB provides both a **CLI tool** for command-line operations and **SDK/libraries** for programmatic access. Since CockroachDB is PostgreSQL-compatible, you can use standard PostgreSQL drivers and tools.

---

## 🖥️ CockroachDB CLI Tool

### What It Is

The `cockroach` CLI is a command-line tool for managing CockroachDB clusters, executing SQL, and performing administrative tasks.

### Installation

#### Windows

**Option 1: Download Binary**
1. Go to: https://www.cockroachlabs.com/docs/stable/install-cockroachdb-windows
2. Download the Windows binary
3. Extract and add to PATH

**Option 2: Using Chocolatey**
```powershell
choco install cockroachdb
```

**Option 3: Using Scoop**
```powershell
scoop install cockroach
```

#### macOS
```bash
brew install cockroachdb/tap/cockroach
```

#### Linux
```bash
# Download and install
curl https://binaries.cockroachdb.com/cockroach-v23.1.11.linux-amd64.tgz | tar -xz
sudo cp -i cockroach-v23.1.11.linux-amd64/cockroach /usr/local/bin/
```

### Common CLI Commands

#### Connect to CockroachDB Cloud
```bash
cockroach sql --url "postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require"
```

#### Connect with Certificate
```bash
cockroach sql --url "postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt"
```

#### Execute SQL File
```bash
cockroach sql --url "[connection-string]" --file schema.sql
```

#### Interactive SQL Shell
```bash
cockroach sql --url "[connection-string]"
```

#### Show Databases
```bash
cockroach sql --url "[connection-string]" -e "SHOW DATABASES;"
```

#### Create Database
```bash
cockroach sql --url "[connection-string]" -e "CREATE DATABASE uaol;"
```

### CLI vs SQL Shell

- **CLI (`cockroach sql`)**: Command-line tool, good for scripts and automation
- **SQL Shell (Web UI)**: Browser-based, good for interactive queries

---

## 📚 SDK and Libraries for Node.js/TypeScript

### Current Setup (What You're Using)

You're already using **`pg` (node-postgres)**, which is the standard PostgreSQL driver that works perfectly with CockroachDB:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

**Location**: `backend/shared/database/connection.ts`

### Available SDK Options

#### 1. **`pg` (node-postgres)** ✅ Currently Using

**Pros:**
- ✅ Lightweight and fast
- ✅ Direct SQL control
- ✅ PostgreSQL-compatible (works with CockroachDB)
- ✅ Well-documented and widely used
- ✅ Connection pooling built-in

**Cons:**
- ❌ No ORM features (manual SQL)
- ❌ No automatic migrations
- ❌ No type safety out of the box

**Installation** (already installed):
```bash
npm install pg @types/pg
```

**Usage** (what you're doing):
```typescript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query('SELECT * FROM users');
```

---

#### 2. **TypeORM** (ORM with TypeScript)

**Pros:**
- ✅ Type-safe database operations
- ✅ Entity decorators
- ✅ Automatic migrations
- ✅ Query builder
- ✅ Supports CockroachDB

**Cons:**
- ❌ Heavier than `pg`
- ❌ Learning curve
- ❌ More setup required

**Installation**:
```bash
npm install typeorm reflect-metadata
npm install --save-dev @types/node
```

**Example**:
```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;
}
```

**Documentation**: https://www.cockroachlabs.com/docs/stable/build-a-typescript-app-with-cockroachdb

---

#### 3. **Prisma** (Modern ORM)

**Pros:**
- ✅ Excellent TypeScript support
- ✅ Auto-generated types
- ✅ Great developer experience
- ✅ Built-in migrations
- ✅ Supports CockroachDB

**Cons:**
- ❌ Requires schema file
- ❌ Code generation step
- ❌ Heavier than `pg`

**Installation**:
```bash
npm install prisma @prisma/client
npx prisma init
```

**Example Schema** (`prisma/schema.prisma`):
```prisma
datasource db {
  provider = "cockroachdb"
  url      = env("DATABASE_URL")
}

model User {
  id    String @id @default(uuid())
  email String @unique
}
```

**Documentation**: https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-cockroachdb

---

#### 4. **Sequelize with sequelize-cockroachdb**

**Pros:**
- ✅ Mature ORM
- ✅ Promise-based
- ✅ Migrations support
- ✅ Works with CockroachDB

**Cons:**
- ❌ Requires special package
- ❌ Less TypeScript-friendly than Prisma/TypeORM

**Installation**:
```bash
npm install sequelize sequelize-cockroachdb
```

**Documentation**: https://www.npmjs.com/package/sequelize-cockroachdb

---

## 🎯 Recommendation for Your Project

### Current Approach (Recommended for Now)

**Stick with `pg` (node-postgres)** because:
- ✅ You're already using it
- ✅ It's working well
- ✅ Simple and lightweight
- ✅ Full control over SQL
- ✅ Perfect for microservices

### When to Consider an ORM

Consider **Prisma** or **TypeORM** if you want:
- Type-safe database operations
- Automatic migrations
- Less boilerplate code
- Better developer experience

### When to Use the CLI

Use the **`cockroach` CLI** for:
- Creating databases: `CREATE DATABASE uaol;`
- Running migrations from command line
- Administrative tasks
- Scripting and automation
- One-off SQL queries

---

## 🚀 Quick Start: Using CockroachDB CLI

### Step 1: Install CLI

**Windows (PowerShell)**:
```powershell
# Download from: https://www.cockroachlabs.com/docs/stable/install-cockroachdb-windows
# Or use Chocolatey:
choco install cockroachdb
```

### Step 2: Verify Installation

```powershell
cockroach version
```

### Step 3: Connect to Your Cluster

```powershell
# Get connection string from CockroachDB Cloud console
cockroach sql --url "postgresql://[user]:[password]@[host]:26257/[database]?sslmode=require"
```

### Step 4: Create Database (Alternative to Web UI)

```powershell
cockroach sql --url "[connection-string]" -e "CREATE DATABASE uaol;"
```

### Step 5: Run Migrations via CLI

```powershell
# Read SQL file and execute
cockroach sql --url "[connection-string]" --file backend/shared/database/schema.sql
```

---

## 📝 Example: Using CLI to Create Database

Instead of using the web SQL Shell, you can use the CLI:

```powershell
# 1. Get your connection string from backend/.env
$env:DATABASE_URL

# 2. Create database
cockroach sql --url "$env:DATABASE_URL" -e "CREATE DATABASE uaol;"

# 3. Verify
cockroach sql --url "$env:DATABASE_URL" -e "SHOW DATABASES;"
```

---

## 🔗 Useful Links

- **CockroachDB CLI Docs**: https://www.cockroachlabs.com/docs/stable/cockroach-commands
- **Node.js with CockroachDB**: https://www.cockroachlabs.com/docs/stable/build-a-nodejs-app-with-cockroachdb
- **TypeScript with CockroachDB**: https://www.cockroachlabs.com/docs/stable/build-a-typescript-app-with-cockroachdb
- **Prisma with CockroachDB**: https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-cockroachdb
- **node-postgres (pg) Docs**: https://node-postgres.com/

---

## 💡 Summary

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **`pg` (node-postgres)** | Database driver | ✅ **Current setup** - Direct SQL, microservices |
| **CockroachDB CLI** | Command-line tool | Creating DBs, running migrations, admin tasks |
| **TypeORM** | TypeScript ORM | Type-safe, migrations, larger apps |
| **Prisma** | Modern ORM | Best DX, auto-types, migrations |
| **Sequelize** | JavaScript ORM | Legacy projects, migrations |

**For your project**: Continue using `pg` for now. Consider Prisma or TypeORM if you want more type safety and automatic migrations.
