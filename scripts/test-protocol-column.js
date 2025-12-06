/**
 * Simple test script to check and add protocol column
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { writeFileSync } from 'fs';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../backend/.env');
dotenv.config({ path: envPath });

import { getDatabasePool } from '../backend/shared/database/connection.js';

const logFile = resolve(__dirname, 'protocol-column-log.txt');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  writeFileSync(logFile, logMessage, { flag: 'a' });
}

async function testProtocolColumn() {
  log('=== Starting protocol column test ===');
  
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    log('Connected to database');
    
    // Check if column exists
    log('Checking if protocol column exists...');
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mcp_tools' AND column_name = 'protocol'
    `);

    if (checkResult.rows.length > 0) {
      log('✅ Protocol column already exists');
      log(`Column details: ${JSON.stringify(checkResult.rows[0])}`);
    } else {
      log('❌ Protocol column does NOT exist');
      log('Attempting to add column...');
      
      try {
        await client.query(`
          ALTER TABLE mcp_tools 
          ADD COLUMN IF NOT EXISTS protocol TEXT NOT NULL DEFAULT 'json-rpc'
        `);
        log('✅ Protocol column added successfully');
        
        // Verify it was added
        const verifyResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'mcp_tools' AND column_name = 'protocol'
        `);
        log(`Verification: ${verifyResult.rows.length > 0 ? 'Column exists' : 'Column still missing'}`);
      } catch (addError) {
        log(`❌ Error adding column: ${addError.message}`);
        log(`Error code: ${addError.code}`);
        log(`Error stack: ${addError.stack}`);
        throw addError;
      }
    }
  } catch (error) {
    log(`❌ Fatal error: ${error.message}`);
    log(`Error code: ${error.code}`);
    log(`Error stack: ${error.stack}`);
    throw error;
  } finally {
    client.release();
    await pool.end();
    log('=== Test completed ===');
  }
}

testProtocolColumn()
  .then(() => {
    log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    log(`Script failed: ${error.message}`);
    process.exit(1);
  });
