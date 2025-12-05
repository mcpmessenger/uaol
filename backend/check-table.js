/**
 * Quick diagnostic script to check backend status and database tables
 * Usage: node check-table.js
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');
dotenv.config({ path: envPath, override: true });

// Force output immediately
process.stdout.write('Starting diagnostic...\n');

async function checkBackend() {
  process.stdout.write('🔍 UAOL Backend Diagnostic Tool\n\n');
  
  // Check environment
  console.log('📋 Environment Check:');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ SET' : '✗ NOT SET');
  console.log('');
  
  // Check if backend is running
  console.log('🌐 Backend Service Check:');
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      const data = await response.json();
      console.log('  API Gateway: ✓ RUNNING on port 3000');
      console.log('  Status:', data.status);
    } else {
      console.log('  API Gateway: ✗ NOT RESPONDING (status:', response.status, ')');
    }
  } catch (error) {
    console.log('  API Gateway: ✗ NOT RUNNING');
    console.log('  Error:', error.message);
    console.log('  → Start backend with: cd backend && npm run dev');
  }
  console.log('');
  
  // Check database connection and tables
  console.log('🗄️  Database Check:');
  try {
    // Try to import the database connection
    let getDatabasePool;
    try {
      const dbModule = await import('@uaol/shared/database/connection');
      getDatabasePool = dbModule.getDatabasePool;
    } catch (importError) {
      console.log('  Shared package: ✗ NOT BUILT');
      console.log('  → Run: cd backend/shared && npm run build');
      console.log('  → Or run: cd backend && npm run build');
      console.log('');
      throw new Error('Shared package not built');
    }
    
    const pool = getDatabasePool();
    const client = await pool.connect();
    
    try {
      // Check if users table exists
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      
      console.log('  Connection: ✓ SUCCESS');
      console.log('  Tables found:', tablesResult.rows.length);
      if (tablesResult.rows.length > 0) {
        tablesResult.rows.forEach(row => {
          console.log('    -', row.table_name);
        });
      }
      
      // Check user_api_keys table specifically
      const hasUserApiKeys = tablesResult.rows.some(r => r.table_name === 'user_api_keys');
      if (hasUserApiKeys) {
        const countResult = await client.query('SELECT COUNT(*) FROM user_api_keys');
        console.log('  user_api_keys: ✓ EXISTS (' + countResult.rows[0].count + ' records)');
      } else {
        console.log('  user_api_keys: ✗ NOT FOUND (run migrations)');
        console.log('  → Run: cd backend && npm run migrate');
      }
      
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.message === 'Shared package not built') {
      // Already handled above
    } else {
      console.log('  Connection: ✗ FAILED');
      console.log('  Error:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.log('  → Database server is not running or DATABASE_URL is incorrect');
      } else if (error.message.includes('password') || error.message.includes('authentication')) {
        console.log('  → Database authentication failed - check DATABASE_URL');
      } else if (error.message.includes('Cannot find module') || error.message.includes('MODULE_NOT_FOUND')) {
        console.log('  → Shared package not built - run: cd backend/shared && npm run build');
      } else {
        console.log('  → Check DATABASE_URL in backend/.env file');
      }
    }
  }
  console.log('');
  
  console.log('✅ Diagnostic complete!');
}

checkBackend().catch(error => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
});
