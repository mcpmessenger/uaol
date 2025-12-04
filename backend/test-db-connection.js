import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  // Show connection details (without password)
  const url = new URL(process.env.DATABASE_URL.replace('postgresql://', 'http://'));
  console.log('   Host:', url.hostname);
  console.log('   Port:', url.port || '5432');
  console.log('   Database:', url.pathname.replace('/', ''));
  console.log('   User:', url.username);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('\n📡 Attempting connection...');
    const result = await pool.query('SELECT NOW(), version(), current_database()');
    console.log('✅ Connection successful!');
    console.log('   Current time:', result.rows[0].now);
    console.log('   Database:', result.rows[0].current_database);
    console.log('   Version:', result.rows[0].version.split(' ')[0]);
    
    // Test query to processing_jobs table
    console.log('\n📊 Testing table access...');
    const tableTest = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'processing_jobs'
    `);
    
    if (tableTest.rows[0].count > 0) {
      console.log('   ✅ processing_jobs table exists');
      
      // Try to query it
      const jobTest = await pool.query('SELECT COUNT(*) as count FROM processing_jobs');
      console.log('   ✅ Can query processing_jobs table');
      console.log('   Jobs in queue:', jobTest.rows[0].count);
    } else {
      console.log('   ⚠️  processing_jobs table not found');
    }
    
    await pool.end();
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 ECONNREFUSED means:');
      console.error('   - Database server is not running');
      console.error('   - Wrong host/port in DATABASE_URL');
      console.error('   - Firewall blocking connection');
      console.error('   - IP not whitelisted (for cloud databases)');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 ETIMEDOUT means:');
      console.error('   - Connection timeout');
      console.error('   - Network issues');
      console.error('   - Database server is slow to respond');
    } else if (error.message.includes('password')) {
      console.error('\n💡 Password error:');
      console.error('   - Check username and password');
      console.error('   - URL-encode special characters in password');
    } else if (error.message.includes('SSL')) {
      console.error('\n💡 SSL error:');
      console.error('   - Add ?sslmode=require to connection string');
      console.error('   - For CockroachDB Cloud, download certificate');
    }
    
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testConnection();
