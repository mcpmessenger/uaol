// Script to check the exact content of GOOGLE lines in .env
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');

console.log('Checking .env file at:', envPath);
console.log('File exists:', existsSync(envPath));
console.log('\n=== All GOOGLE-related lines in .env file ===\n');

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().includes('GOOGLE')) {
      console.log(`Line ${index + 1}:`);
      console.log(`  Raw: "${line}"`);
      console.log(`  Trimmed: "${trimmed}"`);
      console.log(`  Length: ${line.length} (raw), ${trimmed.length} (trimmed)`);
      
      if (trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        console.log(`  Key: "${key}"`);
        console.log(`  Value: "${value}"`);
        console.log(`  Value length: ${value.length}`);
        console.log(`  Value is empty: ${value === ''}`);
        
        // Show raw bytes/char codes for debugging
        if (value.length > 0) {
          console.log(`  First 30 chars of value: "${value.substring(0, 30)}"`);
          // Show first few char codes to detect hidden characters
          const charCodes = Array.from(value.substring(0, 10)).map(c => c.charCodeAt(0));
          console.log(`  First 10 char codes: [${charCodes.join(', ')}]`);
        } else {
          console.log(`  ⚠️ VALUE IS EMPTY!`);
          // Check if there are any hidden characters after the =
          const afterEquals = line.substring(line.indexOf('=') + 1);
          console.log(`  Raw content after '=': "${afterEquals}" (length: ${afterEquals.length})`);
          const afterEqualsCodes = Array.from(afterEquals.substring(0, 5)).map(c => c.charCodeAt(0));
          console.log(`  Char codes after '=': [${afterEqualsCodes.join(', ')}]`);
        }
      }
      console.log('');
    }
  });
  
  // Also check with dotenv parsing
  console.log('\n=== Parsing with dotenv ===\n');
  const dotenv = await import('dotenv');
  const result = dotenv.config({ path: envPath, override: true });
  
  if (result.parsed) {
    console.log('GOOGLE_CLIENT_ID:', result.parsed.GOOGLE_CLIENT_ID ? 
      `"${result.parsed.GOOGLE_CLIENT_ID.substring(0, 30)}..." (${result.parsed.GOOGLE_CLIENT_ID.length} chars)` : 
      'EMPTY or NOT SET');
    console.log('GOOGLE_CLIENT_SECRET:', result.parsed.GOOGLE_CLIENT_SECRET ? 
      `"${result.parsed.GOOGLE_CLIENT_SECRET.substring(0, 30)}..." (${result.parsed.GOOGLE_CLIENT_SECRET.length} chars)` : 
      'EMPTY or NOT SET');
    console.log('GOOGLE_REDIRECT_URI:', result.parsed.GOOGLE_REDIRECT_URI || 'NOT SET');
  }
} else {
  console.error('ERROR: .env file not found!');
}
