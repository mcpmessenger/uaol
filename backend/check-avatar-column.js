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
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  `);
  
  console.log('avatar_url column exists:', result.rows.length > 0);
  
  if (result.rows.length === 0) {
    console.log('\n⚠️  avatar_url column does not exist!');
    console.log('Run migration: cd backend && npm run migrate');
  } else {
    // Check if any users have avatars
    const avatarResult = await pool.query(`
      SELECT user_id, email, avatar_url 
      FROM users 
      WHERE avatar_url IS NOT NULL 
      LIMIT 5
    `);
    console.log('\nUsers with avatars:', avatarResult.rows.length);
    avatarResult.rows.forEach(row => {
      console.log(`  - ${row.email}: ${row.avatar_url?.substring(0, 50)}...`);
    });
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await pool.end();
}

