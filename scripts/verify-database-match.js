// Verify the tool exists in the database that services connect to
// This uses the same DATABASE_URL from backend/.env that services use

const dotenv = require('dotenv');
const { Pool } = require('pg');
const path = require('path');

const envPath = path.resolve(__dirname, '../backend/.env');
console.log('Loading .env from:', envPath);

dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in backend/.env');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set');
const maskedUrl = DATABASE_URL.replace(/:[^:@]+@/, ':****@');
console.log('Database URL:', maskedUrl.substring(0, 100) + '...');
console.log('');

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

const toolId = '940bb568-d19e-42fa-aa10-d880f5267e1c';

async function verify() {
  try {
    console.log('🔍 Step 1: Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    console.log('');

    console.log('🔍 Step 2: Checking if tool exists...');
    console.log('Tool ID:', toolId);
    
    // Test with UUID casting (what the service uses)
    const result = await pool.query(
      'SELECT * FROM mcp_tools WHERE tool_id::uuid = $1::uuid',
      [toolId]
    );
    
    console.log('Query used: WHERE tool_id::uuid = $1::uuid');
    console.log('Rows returned:', result.rows.length);
    console.log('');

    if (result.rows.length > 0) {
      console.log('✅ Tool found in database!');
      const tool = result.rows[0];
      console.log({
        tool_id: tool.tool_id,
        name: tool.name,
        protocol: tool.protocol,
        status: tool.status,
        gateway_url: tool.gateway_url,
      });
      console.log('');
      console.log('✅ The service SHOULD be able to find this tool');
      console.log('   If it still returns "Tool not found", check service logs');
    } else {
      console.log('❌ Tool NOT found in this database');
      console.log('');
      
      console.log('🔍 Step 3: Checking all tools in database...');
      const allTools = await pool.query('SELECT tool_id, name, status, protocol FROM mcp_tools LIMIT 10');
      console.log('Total tools in database:', allTools.rows.length);
      
      if (allTools.rows.length > 0) {
        console.log('Available tools:');
        allTools.rows.forEach((tool, i) => {
          console.log(`  ${i + 1}. ${tool.name} - ${tool.tool_id} - ${tool.status} - ${tool.protocol}`);
        });
        console.log('');
        console.log('⚠️  The tool with ID', toolId, 'does not exist in this database');
        console.log('   You need to insert it into THIS database (the one services connect to)');
      } else {
        console.log('⚠️  No tools found in database');
        console.log('   The mcp_tools table exists but is empty');
      }
      
      console.log('');
      console.log('📋 Solution:');
      console.log('   1. Insert the tool into THIS database using the DATABASE_URL from backend/.env');
      console.log('   2. Or verify you inserted it into the correct database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await pool.end();
    console.log('');
    console.log('✅ Connection closed');
  }
}

verify().catch(console.error);
