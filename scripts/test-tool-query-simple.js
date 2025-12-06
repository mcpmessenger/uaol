// Simple test script - CommonJS version
const dotenv = require('dotenv');
const { Pool } = require('pg');
const path = require('path');

const envPath = path.resolve(__dirname, '../backend/.env');
console.log('Loading .env from:', envPath);

dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set');
const maskedUrl = DATABASE_URL.replace(/:[^:@]+@/, ':****@');
console.log('URL:', maskedUrl.substring(0, 80) + '...');
console.log('Connecting to database...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

const toolId = '940bb568-d19e-42fa-aa10-d880f5267e1c';

async function testQuery() {
  try {
    console.log('\n📋 Querying tool by ID:', toolId);
    
    const result = await pool.query(
      'SELECT * FROM mcp_tools WHERE tool_id = $1',
      [toolId]
    );
    
    console.log('Rows returned:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('✅ Tool found!');
      const tool = result.rows[0];
      console.log({
        tool_id: tool.tool_id,
        name: tool.name,
        protocol: tool.protocol,
        status: tool.status,
        gateway_url: tool.gateway_url,
      });
    } else {
      console.log('❌ Tool not found');
      
      console.log('\n📋 Listing all tools...');
      const allTools = await pool.query('SELECT tool_id, name, status, protocol FROM mcp_tools LIMIT 10');
      console.log('Total tools:', allTools.rows.length);
      
      if (allTools.rows.length > 0) {
        allTools.rows.forEach((tool, i) => {
          console.log(`  ${i + 1}. ${tool.name} - ${tool.tool_id} - ${tool.status} - ${tool.protocol}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await pool.end();
    console.log('\n✅ Connection closed');
  }
}

testQuery().catch(console.error);
