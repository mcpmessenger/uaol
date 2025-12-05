// Find duplicate environment variable definitions
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  const googleVars = new Map();
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key] = trimmed.split('=');
      const varName = key.trim();
      
      if (varName.includes('GOOGLE')) {
        if (!googleVars.has(varName)) {
          googleVars.set(varName, []);
        }
        googleVars.get(varName).push({
          lineNum: index + 1,
          raw: line,
          trimmed: trimmed,
          value: trimmed.split('=').slice(1).join('='),
        });
      }
    }
  });
  
  console.log('=== GOOGLE Environment Variables Found ===\n');
  
  googleVars.forEach((occurrences, varName) => {
    console.log(`${varName}:`);
    if (occurrences.length > 1) {
      console.log(`  ⚠️ DUPLICATE FOUND! This variable is defined ${occurrences.length} times:`);
    }
    occurrences.forEach((occ, idx) => {
      const valuePreview = occ.value.length > 40 ? occ.value.substring(0, 40) + '...' : occ.value;
      const isEmpty = !occ.value || occ.value.trim() === '';
      console.log(`  ${idx + 1}. Line ${occ.lineNum}: ${isEmpty ? '❌ EMPTY' : '✓ HAS VALUE'}`);
      console.log(`     Value: "${valuePreview}" (${occ.value.length} chars)`);
      console.log(`     Raw line: "${occ.raw}"`);
    });
    console.log('');
  });
  
  // Check what dotenv actually parses
  console.log('\n=== What dotenv actually parses ===\n');
  const dotenv = await import('dotenv');
  const result = dotenv.config({ path: envPath, override: true });
  
  if (result.parsed) {
    console.log('GOOGLE_CLIENT_ID:', result.parsed.GOOGLE_CLIENT_ID || 'EMPTY/NOT SET');
    console.log('GOOGLE_CLIENT_SECRET:', result.parsed.GOOGLE_CLIENT_SECRET || 'EMPTY/NOT SET');
    console.log('GOOGLE_REDIRECT_URI:', result.parsed.GOOGLE_REDIRECT_URI || 'NOT SET');
  }
} else {
  console.error('ERROR: .env file not found at:', envPath);
}

