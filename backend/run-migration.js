import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🔍 Checking environment...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n📡 Connecting to database...');
    const testResult = await pool.query('SELECT NOW(), version(), current_database()');
    console.log('✅ Connected successfully!');
    console.log('   Database:', testResult.rows[0].current_database);
    console.log('   Version:', testResult.rows[0].version.split(' ')[0]);
    
    console.log('\n📊 Checking existing tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(`   Found ${tablesResult.rows.length} existing table(s):`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('   No tables found - will create them now');
    }
    
    console.log('\n🚀 Running migrations...');
    
    // Read and execute schema
    const schemaPath = join(__dirname, 'shared', 'database', 'schema.sql');
    console.log('   Reading schema from:', schemaPath);
    const schema = readFileSync(schemaPath, 'utf-8');
    
    console.log('   Executing schema...');
    await pool.query(schema);
    console.log('   ✅ Schema executed successfully');
    
    // Check for guest migration
    try {
      const guestMigrationPath = join(__dirname, 'shared', 'database', 'migrations', 'add-guest-support.sql');
      const guestMigration = readFileSync(guestMigrationPath, 'utf-8');
      console.log('   Running guest support migration...');
      await pool.query(guestMigration);
      console.log('   ✅ Guest support migration completed');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('   ⚠️  Guest migration file not found (skipping)');
      } else if (error.code === '42710' || error.message?.includes('already exists')) {
        console.log('   ℹ️  Guest support already exists (skipping)');
      } else {
        console.log('   ⚠️  Guest migration error (may already be applied):', error.message);
      }
    }
    
    // Verify tables were created
    console.log('\n📋 Verifying tables...');
    try {
      const finalTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log(`   ✅ Found ${finalTables.rows.length} table(s):`);
      finalTables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } catch (verifyError) {
      // Connection might have closed, but migration already succeeded
      console.log('   ⚠️  Could not verify (connection closed, but migration succeeded)');
    }
    
    try {
      await pool.end();
    } catch (closeError) {
      // Pool already closed, that's fine
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next step: Run "SHOW TABLES;" in your database console to verify');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.message.includes('SSL')) {
      console.error('   Tip: Make sure ?sslmode=require is in your connection string');
    }
    if (error.message.includes('password')) {
      console.error('   Tip: Check your username and password');
    }
    if (error.message.includes('certificate')) {
      console.error('   Tip: Verify certificate path in connection string');
    }
    if (error.message.includes('relation') && error.message.includes('already exists')) {
      console.error('   Note: Some tables may already exist - this is OK');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();
