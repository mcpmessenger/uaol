/**
 * Check if workflows table exists in the database
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env manually
const envPath = join(__dirname, '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch (e) {
  // .env might not exist, that's OK
}

// Import after env is loaded
const { Pool } = await import('pg');

function getDatabasePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set in environment');
  }
  return new Pool({ connectionString });
}

async function checkWorkflowsTable() {
  const pool = getDatabasePool();
  
  try {
    console.log('🔍 Checking for workflows table...\n');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'workflows'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ workflows table does NOT exist\n');
      console.log('💡 Run: npm run migrate\n');
      process.exit(1);
    }
    
    console.log('✅ workflows table exists\n');
    
    // Get table columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'workflows' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table structure:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   ${col.column_name}: ${col.data_type} (${nullable})`);
    });
    
    // Check for indexes
    const indexes = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'workflows'
    `);
    
    console.log('\n📊 Indexes:');
    if (indexes.rows.length > 0) {
      indexes.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
    } else {
      console.log('   (no indexes found)');
    }
    
    // Count rows
    const count = await pool.query('SELECT COUNT(*) FROM workflows');
    console.log(`\n📈 Row count: ${count.rows[0].count}`);
    
    console.log('\n✅ workflows table is ready!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('\n💡 The table might not exist. Run: npm run migrate\n');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkWorkflowsTable();

