# Playwright MCP Server Integration Guide

This guide will help you integrate the Microsoft Playwright MCP server for web scraping capabilities.

## Prerequisites

1. **Node.js** 20.x or higher
2. **Playwright MCP Server** - Install from: https://github.com/microsoft/playwright-mcp

## Important: Self-Hosted Service

**You need to run your own Playwright MCP server instance.** MCP servers are self-hosted services (like any backend service) - there's no cloud/hosted version provided by Microsoft. You install and run it on your own machine or server.

## Installation Steps

### 1. Install Playwright MCP Server

The Microsoft Playwright MCP server is installed as an npm package:

```bash
# Install globally (recommended)
npm install -g @playwright/mcp@latest

# Or install locally in a project
npm install @playwright/mcp@latest
```

**Note**: The package name is `@playwright/mcp` (not `@modelcontextprotocol/server-playwright`). Check the [Playwright MCP repository](https://github.com/microsoft/playwright-mcp) for the latest package name.

### 2. Start the Playwright MCP Server

You need to run the Playwright MCP server as a separate process. Here are your options:

#### Option A: Run as Standalone Server (Recommended)

The Playwright MCP server can run as an HTTP server:

```bash
# Run with default settings (persistent profile)
npx @playwright/mcp@latest

# Run in headless mode (no browser GUI)
npx @playwright/mcp@latest --headless

# Run on a specific port (e.g., 8931)
npx @playwright/mcp@latest --port 8931

# Run with specific browser
npx @playwright/mcp@latest --browser chromium
```

The server will run on `http://localhost:8931` by default (or the port you specify).

**Keep this terminal open** - the server needs to keep running for UAOL to connect to it.

#### Option B: Run as Background Service (Linux/Mac)

```bash
# Run in background
nohup npx @playwright/mcp@latest --headless --port 8931 > playwright-mcp.log 2>&1 &

# Check if it's running
ps aux | grep playwright

# View logs
tail -f playwright-mcp.log
```

#### Option C: Run with Docker (Recommended for Production)

**Option C1: Using Docker Compose (Easiest)**

```bash
# From backend directory
docker-compose -f docker-compose.playwright.yml up -d

# Check logs
docker logs uaol-playwright-mcp

# Stop
docker-compose -f docker-compose.playwright.yml down
```

**Option C2: Using Docker Run**

```bash
# Run as a long-lived container
docker run -d \
  --name playwright-mcp \
  --init \
  -p 8931:8931 \
  mcr.microsoft.com/playwright/mcp \
  --headless --browser chromium --no-sandbox --port 8931

# Check logs
docker logs playwright-mcp

# Stop the container
docker stop playwright-mcp
```

#### Option D: Run as Windows Service

On Windows, you can use tools like `nssm` (Non-Sucking Service Manager) to run it as a service, or use Task Scheduler to run it on startup.

### 3. Verify the Server is Running

Before registering, verify the Playwright MCP server is accessible:

```bash
# Test if the server responds (default port is 8931)
curl http://localhost:8931/health

# Or check for MCP manifest
curl http://localhost:8931/mcp/manifest

# Or test with a simple request
curl http://localhost:8931
```

**Note**: The default port is `8931`, not `3000`. Adjust the port in the registration command if you used a different port.

### 4. Register the Tool in UAOL

Once the Playwright MCP server is running, register it as a tool:

#### Using the Helper Script (Easiest):

```bash
# From backend directory
# Make script executable (Linux/Mac)
chmod +x scripts/register-playwright-mcp.sh

# Run the script (default port is 8931)
./scripts/register-playwright-mcp.sh \
  --url http://localhost:8931 \
  --name "Playwright Web Scraper" \
  --protocol json-rpc \
  --cost 2 \
  --token YOUR_JWT_TOKEN
```

#### Using the Node.js Script:

```bash
# From backend directory
node scripts/register-playwright-mcp.js \
  --url http://localhost:8931 \
  --name "Playwright Web Scraper" \
  --protocol json-rpc \
  --cost 2 \
  --token YOUR_JWT_TOKEN
```

#### Using the API Directly:

```bash
curl -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Playwright Web Scraper",
    "gateway_url": "http://localhost:8931",
    "credit_cost_per_call": 2,
    "protocol": "json-rpc"
  }'
```

**Note**: 
- `http://localhost:3000` is your UAOL API Gateway
- `http://localhost:8931` is your Playwright MCP server (the `gateway_url`)

**Note**: Replace `YOUR_TOKEN` with a valid JWT token. You can get one by logging in via the frontend or auth API.

### 5. Approve the Tool

After registration, approve the tool. The tool ID will be returned from the registration step:

```bash
# Replace TOOL_ID with the ID returned from registration
curl -X POST http://localhost:3000/tools/TOOL_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or use the frontend UI:
1. Go to the Tools page
2. Find "Playwright Web Scraper" in the list
3. Click "Approve"

**Note**: Tools must be approved before they can be used in workflows.

## Available Methods

Once registered and approved, the Playwright MCP server typically provides these methods:

- `navigate` - Navigate to a URL
- `screenshot` - Take a screenshot of the page
- `extract_text` - Extract text from the page
- `click` - Click an element
- `fill` - Fill a form field
- `wait_for_selector` - Wait for an element to appear
- `evaluate` - Run JavaScript in the page context
- `get_content` - Get page HTML content
- `scroll` - Scroll the page

**To see all available methods:**

```bash
curl http://localhost:3000/proxy/TOOL_ID/tools \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Check the [Playwright MCP repository](https://github.com/microsoft/playwright-mcp) for the exact method names, parameters, and documentation.

## Usage in Workflows

Once registered and approved, you can use Playwright in your workflows:

1. Add an "MCP Tool" node in the workflow builder
2. Select "Playwright Web Scraper" from the tool list
3. Choose the method (e.g., `navigate`, `extract_text`)
4. Configure parameters (e.g., `{ "url": "https://example.com" }`)

## Troubleshooting

### Server Not Starting

- Ensure Node.js 20+ is installed
- Check that all dependencies are installed: `npm install`
- Verify Playwright browsers are installed: `npx playwright install`

### Connection Errors

- Verify the MCP server is running and accessible
- Check the `gateway_url` matches the server's actual URL
- Ensure the protocol matches (`json-rpc` or `rest`)

### Tool Not Appearing

- Check the tool status (should be "Approved")
- Verify the tool was registered successfully
- Check backend logs for errors

## Example Workflow

A typical web scraping workflow might look like:

1. **Start** node
2. **MCP Tool** (Playwright) - `navigate` to URL
3. **MCP Tool** (Playwright) - `extract_text` to get page content
4. **Text Extraction** - Process the extracted text
5. **AI Generation** - Analyze the content
6. **End** node
