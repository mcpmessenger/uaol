# Playwright MCP Quick Start

Quick guide to get Playwright web scraping working in UAOL.

> **Important**: The Microsoft `@playwright/mcp` package uses stdin/stdout (not HTTP). You need to run the **HTTP Adapter** service to bridge it to UAOL. See [PLAYWRIGHT_INTEGRATION_OPTIONS.md](PLAYWRIGHT_INTEGRATION_OPTIONS.md) for details.

## 🚀 Quick Setup (5 minutes)

### Option A: Use HTTP Adapter (Recommended)

#### 1. Install Playwright MCP Server

```bash
# Install the Microsoft Playwright MCP server
npm install -g @playwright/mcp@latest
npx playwright install
```

#### 2. Start the HTTP Adapter

```bash
cd backend/services/playwright-mcp-adapter
npm install
npm run dev
```

The adapter runs on `http://localhost:8931` and bridges the MCP server to HTTP.

#### 3. Register in UAOL

```bash
cd backend
./scripts/register-playwright-mcp.sh \
  --url http://localhost:8931 \
  --protocol rest \
  --token YOUR_JWT_TOKEN
```

### Option B: Use UAOL's Built-in Playwright Wrapper

UAOL already has a Playwright wrapper! See [PLAYWRIGHT_INTEGRATION_OPTIONS.md](PLAYWRIGHT_INTEGRATION_OPTIONS.md) for details.

### 4. Approve the Tool

```bash
# Get the tool ID from registration output, then:
curl -X POST http://localhost:3000/tools/TOOL_ID/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Use in Workflow Builder

1. Open Workflow Builder
2. Add "MCP Tool" node
3. Select "Playwright Web Scraper"
4. Choose method (e.g., `navigate`, `extract_text`)
5. Configure parameters

## 📚 Full Documentation

- [Integration Options](PLAYWRIGHT_INTEGRATION_OPTIONS.md) - Choose between adapter or built-in wrapper
- [Setup Guide](scripts/setup-playwright-mcp.md) - Detailed setup instructions
- [Architecture](PLAYWRIGHT_MCP_ARCHITECTURE.md) - How it all works

## 🔧 Troubleshooting

**Server not starting?**
- Check Node.js version (20+ required)
- Install Playwright browsers: `npx playwright install`
- Check the repository README for specific setup

**Tool registration fails?**
- Verify MCP server is running and accessible
- Check the `gateway_url` matches server URL
- Ensure JWT token is valid

**Tool not appearing?**
- Check tool status is "Approved"
- Refresh the workflow builder
- Check backend logs for errors

## 💡 Example Usage

**Navigate and Extract Text:**
```json
{
  "method": "navigate",
  "params": {
    "url": "https://example.com"
  }
}
```

```json
{
  "method": "extract_text",
  "params": {
    "selector": "body"
  }
}
```
