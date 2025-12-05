/**
 * Test OpenAI API Key
 * Checks if the API key is valid and can make a test request
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');
dotenv.config({ path: envPath, override: true });

async function testOpenAIKey() {
  console.log('🔍 Testing OpenAI API Key\n');
  
  const apiKey = process.env.OPENAI_API_KEY || '';
  const rawKey = apiKey;
  const trimmedKey = apiKey.trim();
  
  console.log('📋 Key Information:');
  console.log('  Raw key length:', rawKey.length);
  console.log('  Trimmed key length:', trimmedKey.length);
  console.log('  Key starts with "sk-":', trimmedKey.startsWith('sk-'));
  console.log('  Key format valid:', trimmedKey.startsWith('sk-') && trimmedKey.length > 20);
  console.log('  Has whitespace:', rawKey !== trimmedKey);
  console.log('  First 20 chars:', trimmedKey.substring(0, 20) + '...');
  console.log('  Last 10 chars:', '...' + trimmedKey.substring(trimmedKey.length - 10));
  console.log('');
  
  if (!trimmedKey) {
    console.log('❌ ERROR: OPENAI_API_KEY is not set in .env file');
    process.exit(1);
  }
  
  if (!trimmedKey.startsWith('sk-')) {
    console.log('❌ ERROR: API key does not start with "sk-"');
    console.log('   OpenAI API keys should start with "sk-"');
    process.exit(1);
  }
  
  if (trimmedKey.length <= 20) {
    console.log('❌ ERROR: API key is too short');
    console.log('   Valid OpenAI API keys are typically 51+ characters');
    process.exit(1);
  }
  
  if (rawKey !== trimmedKey) {
    console.log('⚠️  WARNING: API key has leading/trailing whitespace');
    console.log('   The key will be trimmed automatically, but check your .env file');
    console.log('');
  }
  
  console.log('🧪 Testing API key with OpenAI...\n');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${trimmedKey}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS: API key is valid!');
      console.log('   Available models:', data.data?.length || 0);
      console.log('   First model:', data.data?.[0]?.id || 'N/A');
      console.log('');
      console.log('💡 Your API key is working correctly.');
      console.log('   If you\'re still getting errors in the chat, check:');
      console.log('   1. The backend has been restarted after updating .env');
      console.log('   2. There are no quotes around the key in .env (e.g., OPENAI_API_KEY="sk-..." is wrong)');
      console.log('   3. The key has sufficient credits/quota');
    } else {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.log('❌ ERROR: API key validation failed');
      console.log('   Status:', response.status, response.statusText);
      console.log('   Error:', errorData.error?.message || 'Unknown error');
      console.log('');
      
      if (response.status === 401) {
        console.log('💡 This means the API key is incorrect or invalid.');
        console.log('   Solutions:');
        console.log('   1. Check if the key is correct in your .env file');
        console.log('   2. Verify the key at https://platform.openai.com/api-keys');
        console.log('   3. Make sure there are no quotes or extra spaces');
        console.log('   4. Generate a new key if this one has been revoked');
      } else if (response.status === 429) {
        console.log('💡 Rate limit exceeded. Wait a moment and try again.');
      } else {
        console.log('💡 Unexpected error. Check your OpenAI account status.');
      }
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ ERROR: Failed to connect to OpenAI API');
    console.log('   Error:', error.message);
    console.log('   Check your internet connection');
    process.exit(1);
  }
}

testOpenAIKey().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
