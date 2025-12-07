# Playwright MCP Architecture Explained

## Do I Need to Run My Own Server?

**Yes, you need to run your own Playwright MCP server instance.**

MCP (Model Context Protocol) servers are **self-hosted services** - similar to how you run your own database, Redis, or any other backend service. There is no cloud/hosted version provided by Microsoft.

## Architecture Overview

```
┌─────────────────┐
│   UAOL System   │
│  (Your Backend) │
└────────┬────────┘
         │
         │ HTTP/JSON-RPC
         │ (via gateway_url)
         │
         ▼
┌─────────────────┐
│ Playwright MCP  │
│     Server      │  ← You run this yourself
│  (Port 8931)    │
└─────────────────┘
         │
         │ Controls
         │
         ▼
┌─────────────────┐
│   Browser       │
│  (Chromium)     │  ← Playwright controls this
└─────────────────┘
```

## Why Self-Hosted?

1. **Security**: You control what websites are accessed
2. **Privacy**: Web scraping happens on your infrastructure
3. **Customization**: You can configure browsers, proxies, etc.
4. **Cost Control**: No per-request fees from a third party
5. **Standard MCP Pattern**: All MCP servers follow this self-hosted model

## How It Works

1. **You install** the Playwright MCP server package
2. **You run** it as a service (locally, Docker, or on a server)
3. **UAOL connects** to your instance via the `gateway_url`
4. **When workflows execute**, UAOL sends requests to your Playwright server
5. **Your Playwright server** controls browsers and performs web scraping

## Deployment Options

### Option 1: Local Development
```bash
# Run in a terminal (keep it open)
npx @playwright/mcp@latest --headless --port 8931
```

### Option 2: Docker (Recommended)
```bash
# Run as container
docker-compose -f docker-compose.playwright.yml up -d
```

### Option 3: Production Server
- Install on your server
- Run as a systemd service (Linux) or Windows Service
- Or use a process manager like PM2

## Port Configuration

- **UAOL API Gateway**: Port `3000` (your main backend)
- **Playwright MCP Server**: Port `8931` (default, can be changed)

When registering the tool, use:
- `--api-url http://localhost:3000` (UAOL API Gateway)
- `--url http://localhost:8931` (Your Playwright MCP server)

## Summary

- ✅ **You run** the Playwright MCP server yourself
- ✅ It's a **separate service** from UAOL
- ✅ UAOL **connects to** your Playwright server
- ✅ Similar to running a database or Redis - it's infrastructure you manage
- ❌ There's **no hosted/cloud version** - you must self-host

This is the standard MCP architecture - each organization runs their own MCP servers for security and control.
