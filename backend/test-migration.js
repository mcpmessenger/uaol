import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function testAndMigrate() {
  console.log('🔍 Testing CockroachDB connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Test connection
    console.log('\n📡 Connecting to database...');
    const testResult = await pool.query('SELECT NOW(), version()');
    console.log('✅ Connection successful!');
    console.log('   Current time:', testResult.rows[0].now);
    console.log('   Database:', testResult.rows[0].version.split(' ')[0]);
    
    // Check current database
    const dbResult = await pool.query('SELECT current_database()');
    console.log('   Current database:', dbResult.rows[0].current_database);
    
    // Check existing tables
    console.log('\n📊 Checking existing tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(`   Found ${tablesResult.rows.length} table(s):`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('   No tables found - ready to run migrations');
    }
    
    await pool.end();
    console.log('\n✅ Connection test complete!');
    console.log('\n💡 Next step: Run "npm run migrate" to create tables');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    if (error.message.includes('SSL')) {
      console.error('   Tip: Make sure ?sslmode=require is in your connection string');
    }
    if (error.message.includes('password')) {
      console.error('   Tip: Check your username and password');
    }
    if (error.message.includes('certificate')) {
      console.error('   Tip: Verify certificate path in connection string');
    }
    process.exit(1);
  }
}

testAndMigrate();
