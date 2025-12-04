import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDatabasePool } from './connection';
import { createLogger } from '../logger/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger('migration');

async function runMigrations() {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    logger.info('Starting database migrations...');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    logger.info('Connecting to database...');

    // Execute schema
    await client.query(schema);

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  } finally {
    client.release();
  }
}

// Always run migrations when this file is executed directly
runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { runMigrations };

