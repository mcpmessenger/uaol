/**
 * Script to add protocol column to mcp_tools table
 * Run with: node scripts/add-protocol-column.js
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../backend/.env');
dotenv.config({ path: envPath });

import { getDatabasePool } from '../backend/shared/database/connection.js';

async function addProtocolColumn() {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    console.log('Checking if protocol column exists...');
    
    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mcp_tools' AND column_name = 'protocol'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Protocol column already exists');
      return;
    }

    console.log('Adding protocol column...');
    // Use IF NOT EXISTS for CockroachDB compatibility
    await client.query(`
      ALTER TABLE mcp_tools 
      ADD COLUMN IF NOT EXISTS protocol TEXT NOT NULL DEFAULT 'json-rpc'
    `);

    // Try to add constraint (may fail if it already exists, which is OK)
    try {
      await client.query(`
        ALTER TABLE mcp_tools 
        ADD CONSTRAINT mcp_tools_protocol_check 
        CHECK (protocol IN ('json-rpc', 'rest'))
      `);
      console.log('✅ Check constraint added');
    } catch (constraintError: any) {
      if (constraintError.message?.includes('already exists') || constraintError.code === '42710') {
        console.log('ℹ️  Check constraint already exists (this is OK)');
      } else {
        throw constraintError;
      }
    }

    console.log('✅ Protocol column added successfully');
  } catch (error: any) {
    console.error('❌ Error adding protocol column:', error.message);
    if (error.message?.includes('already exists') || error.code === '42710') {
      console.log('ℹ️  Column may already exist (this is OK)');
      return;
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addProtocolColumn()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
