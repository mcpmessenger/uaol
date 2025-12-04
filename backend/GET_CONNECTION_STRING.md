# How to Get Your Exact Supabase Connection String

## Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/yhdgadyquizxrfmehkno

2. **Go to Settings → Database**
   - Click "Settings" in the left sidebar
   - Click "Database" under Configuration

3. **Find "Connection string" section**
   - Scroll down to find the connection string section
   - You'll see tabs: "URI", "JDBC", "Golang", etc.

4. **Select the "URI" tab**
   - This shows the PostgreSQL connection string

5. **Copy the connection string**
   - It should look like one of these formats:
   
   **Format 1 (Direct connection):**
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   
   **Format 2 (Transaction pooler):**
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   
   **Format 3 (Session pooler):**
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```

6. **For our backend, use the DIRECT connection (port 5432)**
   - Look for a connection string that uses port **5432** (not 6543)
   - Or use the format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## Alternative: Get from Connection Pooling section

1. In Database Settings, look for "Connection pooling"
2. Find the "Direct connection" option
3. Copy that connection string
4. Replace `[YOUR-PASSWORD]` with your actual password: `AYr?6-65&wb5e*$`

## Update Your .env

Once you have the correct connection string, update your `.env` file:

```env
DATABASE_URL=postgresql://postgres:AYr?6-65&wb5e*$@[ACTUAL-HOSTNAME-FROM-SUPABASE]:5432/postgres
```

Or if you need URL encoding:
```env
DATABASE_URL=postgresql://postgres:AYr%3F6-65%26wb5e*%24@[ACTUAL-HOSTNAME-FROM-SUPABASE]:5432/postgres
```

## Test Connection

After updating, test with:
```powershell
node check-env.js
npm run migrate
```

