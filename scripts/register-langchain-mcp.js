/**
 * Script to register LangchainMCP tool in UAOL
 * 
 * Usage:
 *   node scripts/register-langchain-mcp.js
 * 
 * Or with custom API URL:
 *   API_BASE_URL=http://localhost:3000 node scripts/register-langchain-mcp.js
 */

// Use node-fetch for Node.js compatibility
let fetch;
try {
  // Try to use native fetch (Node 18+)
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  // Fallback to node-fetch if not available
  fetch = require('node-fetch');
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TOOL_NAME = 'Langchain Agent';
const GATEWAY_URL = 'https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp';
const PROTOCOL = 'rest';
const CREDIT_COST = 5;

async function registerTool() {
  try {
    console.log('Registering LangchainMCP tool...');
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log(`Gateway URL: ${GATEWAY_URL}`);
    console.log(`Protocol: ${PROTOCOL}`);
    console.log('');
    
    // Test connection first
    console.log('Testing API connection...');
    try {
      const testResponse = await fetch(`${API_BASE_URL}/tools`);
      console.log(`✅ API is accessible (Status: ${testResponse.status})`);
    } catch (testError) {
      console.error(`❌ Cannot connect to API at ${API_BASE_URL}`);
      console.error(`   Error: ${testError.message}`);
      console.error('\n💡 Make sure the backend services are running:');
      console.error('   - API Gateway (port 3000)');
      console.error('   - Tool Registry Service (port 3002)');
      return;
    }
    
    console.log('\nRegistering tool...');
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${API_BASE_URL}/tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization header if you have a token
          // 'Authorization': `Bearer YOUR_TOKEN_HERE`,
        },
        body: JSON.stringify({
          name: TOOL_NAME,
          gateway_url: GATEWAY_URL,
          credit_cost_per_call: CREDIT_COST,
          protocol: PROTOCOL,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
      }
      
      if (result.success) {
        console.log('\n✅ Tool registered successfully!');
        console.log('Tool ID:', result.data.tool_id);
        console.log('Status:', result.data.status);
        console.log('\n⚠️  Note: The tool is in "Pending" status and needs to be approved.');
        console.log('\nTo approve the tool, run:');
        console.log(`  curl -X POST ${API_BASE_URL}/tools/${result.data.tool_id}/approve`);
        console.log('\nOr update the database directly:');
        console.log(`  UPDATE mcp_tools SET status = 'Approved' WHERE tool_id = '${result.data.tool_id}';`);
      } else {
        console.error('❌ Registration failed:', result.error);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out after 10 seconds. The server may be hanging on a database query.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('\n❌ Error registering tool:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure the backend services are running');
    console.error('2. Check that API_BASE_URL is correct');
    console.error('3. Verify the gateway URL is accessible');
    console.error('4. Check if authentication is required');
    process.exit(1);
  }
}

registerTool();
