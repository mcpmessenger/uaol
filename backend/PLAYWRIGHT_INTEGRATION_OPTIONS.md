# Playwright Integration Options

## Important Note

The Microsoft `@playwright/mcp` package is designed for **MCP clients** (like VS Code, Cursor) that communicate via **stdin/stdout**, not HTTP. UAOL expects **HTTP endpoints** for MCP tools.

You have **two options**:

## Option 1: Use UAOL's Built-in Playwright Wrapper (Recommended)

UAOL already includes a Playwright wrapper that works! You don't need to install or run a separate server.

### How to Use It

The existing Playwright wrapper is available as `playwright_scraper` in the wrapper dispatcher. However, it's currently only accessible via the wrapper execution endpoint, not as a registered MCP tool.

**To make it available as an MCP tool**, you would need to:
1. Create an HTTP adapter service that wraps the existing Playwright wrapper
2. Register that HTTP service as an MCP tool

**OR** we can enhance the existing wrapper to be directly usable in workflows.

## Option 2: Create HTTP Adapter for Microsoft's Playwright MCP

If you want to use the official Microsoft `@playwright/mcp` server, you'll need to create an HTTP adapter since it only supports stdin/stdout.

### Step 1: Install the Package

```bash
npm install -g @playwright/mcp@latest
npx playwright install
```

### Step 2: Create HTTP Adapter

Create a simple HTTP server that wraps the MCP server:

```javascript
// playwright-mcp-http-adapter.js
import { spawn } from 'child_process';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const { method, params } = req.body;
  
  // Spawn the MCP server as a subprocess
  const mcpProcess = spawn('npx', ['@playwright/mcp@latest'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Send MCP request via stdin
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: method,
      arguments: params
    }
  };
  
  mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
  mcpProcess.stdin.end();
  
  // Read response from stdout
  let output = '';
  mcpProcess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  mcpProcess.on('close', (code) => {
    if (code === 0) {
      try {
        const response = JSON.parse(output);
        res.json({ success: true, data: response.result });
      } catch (e) {
        res.status(500).json({ success: false, error: e.message });
      }
    } else {
      res.status(500).json({ success: false, error: 'MCP process failed' });
    }
  });
});

app.listen(8931, () => {
  console.log('Playwright MCP HTTP Adapter running on http://localhost:8931');
});
```

### Step 3: Run the Adapter

```bash
node playwright-mcp-http-adapter.js
```

### Step 4: Register in UAOL

```bash
./scripts/register-playwright-mcp.sh \
  --url http://localhost:8931 \
  --token YOUR_JWT_TOKEN
```

## Recommendation

**Use Option 1** (UAOL's existing wrapper) - it's simpler and already integrated. We can enhance it to be more feature-complete if needed.

If you specifically need features from Microsoft's MCP server, then use Option 2 with the HTTP adapter.
