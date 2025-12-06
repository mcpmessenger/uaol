# Debug Protocol Column Issue

## Current Status
- ✅ `protocol` column EXISTS in the database (verified via SQL query)
- ❌ Service still reports "column 'protocol' does not exist"

## Possible Causes

### 1. Service Not Restarted
The service needs to be restarted to pick up schema changes.

**Solution:**
```bash
# Stop the tool-registry-service (Ctrl+C)
# Then restart:
cd backend
npm run dev --workspace=@uaol/tool-registry-service
```

### 2. Wrong Database Connection
The service might be connecting to a different database.

**Check:**
- Verify `DATABASE_URL` in `backend/.env` points to the correct CockroachDB cluster
- Check service logs for connection string
- Verify the service is using the same database where you created the table

### 3. Connection Pool Caching
PostgreSQL connection pools can cache schema information.

**Solution:**
- Restart the service (this will recreate the connection pool)
- Or manually close and recreate connections

### 4. Tool Record Doesn't Exist
The tool with ID `59540a12-6c11-4808-ac5a-9ec60ed9d012` might not exist.

**Check:**
```sql
SELECT tool_id, name, protocol, status
FROM mcp_tools 
WHERE tool_id = '59540a12-6c11-4808-ac5a-9ec60ed9d012';
```

## Next Steps

1. **Verify tool exists:**
   Run `scripts/check-tool-protocol.sql` in CockroachDB SQL Shell

2. **Restart the service:**
   Stop and restart tool-registry-service

3. **Check service logs:**
   Look for database connection errors or warnings

4. **Test again:**
   ```bash
   curl -X PUT http://localhost:3002/tools/59540a12-6c11-4808-ac5a-9ec60ed9d012 \
     -H "Content-Type: application/json" \
     -d '{"protocol":"rest"}'
   ```
