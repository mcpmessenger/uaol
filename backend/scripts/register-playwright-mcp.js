#!/usr/bin/env node

/**
 * Helper script to register the Playwright MCP server as a tool in UAOL
 * 
 * Usage:
 *   node scripts/register-playwright-mcp.js [options]
 * 
 * Options:
 *   --url <url>          Playwright MCP server URL (default: http://localhost:8931)
 *   --name <name>        Tool name (default: "Playwright Web Scraper")
 *   --protocol <proto>   Protocol: json-rpc or rest (default: json-rpc)
 *   --cost <number>      Credit cost per call (default: 2)
 *   --token <token>      JWT token for authentication
 *   --api-url <url>      UAOL API Gateway URL (default: http://localhost:3000)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  url: 'http://localhost:8931',  // Playwright MCP default port
  name: 'Playwright Web Scraper',
  protocol: 'json-rpc',
  cost: 2,
  token: null,
  apiUrl: 'http://localhost:3000',  // UAOL API Gateway port
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--url' && args[i + 1]) {
    options.url = args[++i];
  } else if (arg === '--name' && args[i + 1]) {
    options.name = args[++i];
  } else if (arg === '--protocol' && args[i + 1]) {
    options.protocol = args[++i];
  } else if (arg === '--cost' && args[i + 1]) {
    options.cost = parseInt(args[++i], 10);
  } else if (arg === '--token' && args[i + 1]) {
    options.token = args[++i];
  } else if (arg === '--api-url' && args[i + 1]) {
    options.apiUrl = args[++i];
  }
}

// Try to get token from environment or .env file
if (!options.token) {
  try {
    const envPath = resolve(__dirname, '../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const tokenMatch = envContent.match(/JWT_TOKEN=(.+)/);
    if (tokenMatch) {
      options.token = tokenMatch[1].trim();
    }
  } catch (e) {
    // .env file not found or no token
  }
  
  // Try environment variable
  if (!options.token && process.env.JWT_TOKEN) {
    options.token = process.env.JWT_TOKEN;
  }
}

async function registerTool() {
  if (!options.token) {
    console.error('❌ Error: JWT token is required');
    console.error('   Provide it via --token option, JWT_TOKEN env var, or .env file');
    process.exit(1);
  }

  console.log('🚀 Registering Playwright MCP server...');
  console.log(`   Name: ${options.name}`);
  console.log(`   Gateway URL: ${options.url}`);
  console.log(`   Protocol: ${options.protocol}`);
  console.log(`   Credit Cost: ${options.cost}`);

  try {
    const response = await fetch(`${options.apiUrl}/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.token}`,
      },
      body: JSON.stringify({
        name: options.name,
        gateway_url: options.url,
        credit_cost_per_call: options.cost,
        protocol: options.protocol,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Registration failed:');
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    if (data.success) {
      console.log('✅ Tool registered successfully!');
      console.log(`   Tool ID: ${data.data.tool_id}`);
      console.log(`   Status: ${data.data.status}`);
      console.log('\n📝 Next steps:');
      console.log(`   1. Approve the tool: curl -X POST ${options.apiUrl}/tools/${data.data.tool_id}/approve -H "Authorization: Bearer ${options.token}"`);
      console.log(`   2. Or approve it via the frontend UI`);
      console.log(`   3. The tool will be available in workflow builder once approved`);
    } else {
      console.error('❌ Registration failed:', data.error?.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error registering tool:', error.message);
    console.error('   Make sure:');
    console.error('   - The API Gateway is running');
    console.error('   - The Playwright MCP server is running');
    console.error('   - Your JWT token is valid');
    process.exit(1);
  }
}

registerTool();
