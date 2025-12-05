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

    // Run additional migrations
    logger.info('Running additional migrations...');
    
    // Migration: Add guest support
    const guestMigrationPath = join(__dirname, 'migrations', 'add-guest-support.sql');
    try {
      const guestMigration = readFileSync(guestMigrationPath, 'utf-8');
      await client.query(guestMigration);
      logger.info('Guest support migration completed');
    } catch (error: any) {
      // Migration might already be applied - check error code
      if (error.code === 'ENOENT') {
        logger.warn('Guest migration file not found, skipping...');
      } else if (error.code === '42710' || error.message?.includes('already exists')) {
        // Object already exists - this is OK, migration already applied
        logger.info('Guest support migration already applied, skipping...');
      } else {
        logger.warn('Guest migration error (may already be applied):', error.message);
      }
    }

    // Migration: Add user API keys
    const apiKeysMigrationPath = join(__dirname, 'migrations', 'add-user-api-keys.sql');
    try {
      const apiKeysMigration = readFileSync(apiKeysMigrationPath, 'utf-8');
      await client.query(apiKeysMigration);
      logger.info('User API keys migration completed');
    } catch (error: any) {
      // Migration might already be applied - check error code
      if (error.code === 'ENOENT') {
        logger.warn('User API keys migration file not found, skipping...');
      } else if (error.code === '42710' || error.message?.includes('already exists') || error.message?.includes('duplicate key')) {
        // Object already exists - this is OK, migration already applied
        logger.info('User API keys migration already applied, skipping...');
      } else {
        logger.warn('User API keys migration error (may already be applied):', error.message);
      }
    }

    // Migration: Add OAuth tokens table
    const oauthTokensMigrationPath = join(__dirname, 'migrations', 'add-oauth-tokens.sql');
    try {
      const oauthTokensMigration = readFileSync(oauthTokensMigrationPath, 'utf-8');
      await client.query(oauthTokensMigration);
      logger.info('OAuth tokens migration completed');
    } catch (error: any) {
      // Migration might already be applied - check error code
      if (error.code === 'ENOENT') {
        logger.warn('OAuth tokens migration file not found, skipping...');
      } else if (error.code === '42710' || error.message?.includes('already exists') || error.message?.includes('duplicate key')) {
        // Object already exists - this is OK, migration already applied
        logger.info('OAuth tokens migration already applied, skipping...');
      } else {
        logger.warn('OAuth tokens migration error (may already be applied):', error.message);
      }
    }

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

