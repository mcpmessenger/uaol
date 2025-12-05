// Quick diagnostic script to test OpenAI API key
// Run: node test-openai-key.js

require('dotenv').config({ path: '.env' });

const apiKey = process.env.OPENAI_API_KEY;

console.log('\n=== OpenAI API Key Diagnostic ===\n');

if (!apiKey) {
  console.log('❌ OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

// Check key format
console.log('Key Info:');
console.log(`  Length: ${apiKey.length}`);
console.log(`  Starts with: ${apiKey.substring(0, 12)}...`);
console.log(`  Ends with: ...${apiKey.substring(apiKey.length - 8)}`);
console.log(`  Has whitespace: ${apiKey !== apiKey.trim()}`);
console.log(`  Format valid: ${apiKey.trim().startsWith('sk-')}`);

const trimmedKey = apiKey.trim();

if (!trimmedKey.startsWith('sk-')) {
  console.log('\n❌ ERROR: Key does not start with "sk-"');
  console.log('   Make sure your key in .env has no quotes and starts with "sk-"');
  process.exit(1);
}

// Test the key with a simple API call
console.log('\nTesting API key...\n');

const https = require('https');

const options = {
  hostname: 'api.openai.com',
  path: '/v1/models',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${trimmedKey}`,
  },
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ API key is VALID and working!');
      try {
        const jsonData = JSON.parse(data);
        console.log(`   Available models: ${jsonData.data?.length || 'unknown'}`);
      } catch (e) {
        // Ignore parse errors
      }
      process.exit(0);
    } else {
      console.log('❌ API key test FAILED');
      console.log(`   Status: ${res.statusCode}`);
      try {
        const errorData = JSON.parse(data);
        console.log(`   Error: ${errorData.error?.message || 'Unknown error'}`);
        
        if (errorData.error?.message?.includes('Incorrect API key')) {
          console.log('\n💡 The key is being rejected by OpenAI.');
          console.log('   Possible causes:');
          console.log('   1. Key is expired or revoked');
          console.log('   2. Key belongs to a different account');
          console.log('   3. Key has extra characters or is malformed');
          console.log('\n   Solution: Create a new key at https://platform.openai.com/api-keys');
        }
      } catch (e) {
        console.log(`   Raw response: ${data.substring(0, 200)}`);
      }
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Network error:', error.message);
  process.exit(1);
});

req.end();
