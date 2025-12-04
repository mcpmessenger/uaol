import { Pool, PoolConfig } from 'pg';
import { config } from '../config/index.js';

let pool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (!pool) {
    const poolConfig: PoolConfig = {
      connectionString: config.database.url,
      min: config.database.poolMin,
      max: config.database.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

