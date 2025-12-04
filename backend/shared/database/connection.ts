import { Pool, PoolConfig } from 'pg';
import { config } from '../config/index.js';

// Log when module loads to confirm it's being used
console.log('[DB Connection] Module loaded at:', new Date().toISOString());

let pool: Pool | null = null;
let poolConnectionString: string | null = null;

export function getDatabasePool(): Pool {
  // NUCLEAR OPTION: If process.env.DATABASE_URL is set and NOT localhost, ALWAYS use it
  // Destroy any existing pool that uses localhost
  if (process.env.DATABASE_URL && 
      !process.env.DATABASE_URL.includes('localhost') && 
      !process.env.DATABASE_URL.includes('127.0.0.1')) {
    
    // If pool exists and uses localhost, destroy it immediately
    if (pool && poolConnectionString && 
        (poolConnectionString.includes('localhost') || poolConnectionString.includes('127.0.0.1'))) {
      console.error('[DB Connection] 🚨 DESTROYING localhost pool - process.env.DATABASE_URL is set!');
      pool.end().catch(() => { /* ignore */ });
      pool = null;
      poolConnectionString = null;
    }
    
    // Use process.env.DATABASE_URL directly, ignore config
    const currentConnectionString = process.env.DATABASE_URL;
    
    if (!pool || poolConnectionString !== currentConnectionString) {
      if (pool) {
        console.log('[DB Connection] Recreating pool - connection string changed');
        pool.end().catch(() => { /* ignore */ });
        pool = null;
        poolConnectionString = null;
      }
      
      const urlForLogging = currentConnectionString.replace(/:[^:@]+@/, ':****@');
      console.log('[DB Connection] Creating pool with Supabase URL:', urlForLogging.substring(0, 100) + '...');
      
      const poolConfig: PoolConfig = {
        connectionString: currentConnectionString,
        min: config.database.poolMin,
        max: config.database.poolMax,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: false,
      };

      pool = new Pool(poolConfig);
      poolConnectionString = currentConnectionString;

      pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
      });

      pool.on('connect', () => {
        console.log('[DB Connection] ✅ Database connection established');
      });
      
      return pool;
    }
    
    return pool;
  }
  
  // Fallback: use config if process.env.DATABASE_URL is not set
  const currentConnectionString = process.env.DATABASE_URL || config.database.url;
  
  // AGGRESSIVE: If process.env.DATABASE_URL is set and pool was created with localhost, ALWAYS recreate
  // This handles the case where pool was created before .env was loaded
  const envUrlSet = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1');
  const poolIsLocalhost = poolConnectionString && (poolConnectionString.includes('localhost') || poolConnectionString.includes('127.0.0.1'));
  const shouldRecreate = pool && (poolConnectionString !== currentConnectionString || (poolIsLocalhost && envUrlSet));
  
  if (shouldRecreate) {
    console.log('[DB Connection] ⚠️  Connection string mismatch - recreating pool');
    console.log('[DB Connection] Old:', poolConnectionString ? poolConnectionString.substring(0, 60) + '...' : 'null');
    console.log('[DB Connection] New:', currentConnectionString.substring(0, 60) + '...');
    console.log('[DB Connection] process.env.DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    // Close old pool (don't wait - fire and forget)
    if (pool) {
      pool.end().catch(() => { /* ignore errors */ });
    }
    pool = null;
    poolConnectionString = null;
  }
  
  if (!pool) {
    const urlForLogging = currentConnectionString.replace(/:[^:@]+@/, ':****@');
    process.stdout.write(`[DB Connection] Creating pool with connection string: ${urlForLogging.substring(0, 100)}...\n`);
    process.stdout.write(`[DB Connection] process.env.DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}\n`);
    
    // Check if it's the default localhost
    if (currentConnectionString.includes('localhost') || currentConnectionString.includes('127.0.0.1')) {
      console.error('[DB Connection] ⚠️  WARNING: Using localhost connection!');
      if (process.env.DATABASE_URL) {
        const envUrlForLogging = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
        console.error('[DB Connection] ⚠️  process.env.DATABASE_URL is set but not being used!');
        console.error('[DB Connection] process.env.DATABASE_URL value:', envUrlForLogging.substring(0, 80) + '...');
        console.error('[DB Connection] This should not happen - pool should use process.env.DATABASE_URL');
      }
    }
    
    const poolConfig: PoolConfig = {
      connectionString: currentConnectionString,
      min: config.database.poolMin,
      max: config.database.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased from 2000ms to 10 seconds
      // Additional options for better connection handling
      allowExitOnIdle: false,
    };

    pool = new Pool(poolConfig);
    poolConnectionString = currentConnectionString;

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    pool.on('connect', () => {
      // Connection established successfully
    });
  }

  return pool;
}

// Helper function to test and warm up the connection pool
export async function warmUpConnectionPool(): Promise<void> {
  const pool = getDatabasePool();
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    // If warm-up fails, log but don't throw - let services retry
    console.warn('Connection pool warm-up failed, will retry on first query:', error);
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    poolConnectionString = null;
  }
}

