import { Pool } from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');

dotenv.config({ path: envPath });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

try {
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'document_vectors'
    ORDER BY ordinal_position
  `);
  
  console.log('\n📊 document_vectors table columns:');
  result.rows.forEach(row => {
    console.log(`  - ${row.column_name} (${row.data_type})`);
  });
  
  const hasUserId = result.rows.some(row => row.column_name === 'user_id');
  console.log(`\n${hasUserId ? '✅' : '❌'} user_id column: ${hasUserId ? 'EXISTS' : 'MISSING'}`);
  
  // Check if there are any vectors stored
  const countResult = await pool.query('SELECT COUNT(*) as count FROM document_vectors');
  console.log(`\n📈 Total vectors stored: ${countResult.rows[0]?.count || 0}`);
  
  if (!hasUserId) {
    console.log('\n⚠️  WARNING: user_id column is missing!');
    console.log('   Documents are NOT isolated by user.');
    console.log('   All users can access all document vectors.');
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await pool.end();
}



