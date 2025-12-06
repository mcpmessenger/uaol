// Test script to verify tool exists in database
// Run: node scripts/test-tool-query.js

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../backend/.env');

console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set');
console.log('Connecting to database...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

const toolId = '940bb568-d19e-42fa-aa10-d880f5267e1c';

async function testQuery() {
  try {
    // Test 1: Check if tool exists
    console.log('\n📋 Test 1: Query tool by ID');
    console.log('Tool ID:', toolId);
    
    const result = await pool.query(
      'SELECT * FROM mcp_tools WHERE tool_id = $1',
      [toolId]
    );
    
    console.log('Rows returned:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('✅ Tool found!');
      console.log('Tool details:', {
        tool_id: result.rows[0].tool_id,
        name: result.rows[0].name,
        protocol: result.rows[0].protocol,
        status: result.rows[0].status,
        gateway_url: result.rows[0].gateway_url,
        developer_id: result.rows[0].developer_id,
      });
    } else {
      console.log('❌ Tool not found');
      
      // Test 2: Check all tools
      console.log('\n📋 Test 2: List all tools');
      const allTools = await pool.query('SELECT tool_id, name, status, protocol FROM mcp_tools');
      console.log('Total tools:', allTools.rows.length);
      
      if (allTools.rows.length > 0) {
        console.log('Available tools:');
        allTools.rows.forEach((tool, i) => {
          console.log(`  ${i + 1}. ${tool.name} (${tool.tool_id}) - ${tool.status} - ${tool.protocol}`);
        });
      } else {
        console.log('⚠️  No tools in database');
      }
      
      // Test 3: Check if tool_id format matches
      console.log('\n📋 Test 3: Check tool_id format');
      const uuidTools = await pool.query(`
        SELECT tool_id, name 
        FROM mcp_tools 
        WHERE tool_id::text LIKE $1
      `, [`%${toolId.substring(0, 8)}%`]);
      
      console.log('Tools with similar ID prefix:', uuidTools.rows.length);
      if (uuidTools.rows.length > 0) {
        console.log('Similar tools:', uuidTools.rows);
      }
    }
    
    // Test 4: Verify table structure
    console.log('\n📋 Test 4: Check table structure');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mcp_tools'
      ORDER BY ordinal_position
    `);
    
    console.log('Table columns:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testQuery();
