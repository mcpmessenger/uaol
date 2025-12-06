# MCP Tools Workflow Integration Guide

## Overview

The UAOL workflow builder now supports integrating MCP (Model Context Protocol) tools directly into workflows. This allows you to use external tools like LangchainMCP agents, Playwright scrapers, Google Places API, and any other MCP-compliant service in your workflow steps.

## Features

✅ **Self-Service Tool Registration** - Register external MCP tools via API  
✅ **Visual Workflow Integration** - Drag and drop MCP tools into workflows  
✅ **Dual Protocol Support** - Works with both JSON-RPC and REST-style MCP services  
✅ **Image/Data Support** - Pass images, files, and complex data to MCP tools  
✅ **Method Selection** - Choose specific methods from each MCP tool  

## Using MCP Tools in Workflows

### 1. Accessing MCP Tools

1. Open the Workflow Builder
2. Click the **ChevronRight button** (▶) in the top-left corner to open the tools menu
3. Scroll down to see the **MCP Tools** section (below the built-in node types)
4. The section will show all registered and approved MCP tools

### 2. Adding an MCP Tool to Your Workflow

1. **Open Tools Menu** - Click the ChevronRight button (top-left)
2. **Scroll to MCP Tools** - Find the "MCP Tools" section below the separator
3. **Browse Tools** - See all available MCP tools with their protocol type (REST/JSON-RPC)
4. **Expand Tool** - Click on a tool to see its available methods
5. **Select Method** - Click on a method to add it to your workflow canvas
6. **Configure** - Click the node to configure parameters

**Note:** If you don't see any MCP tools, click the "Refresh" button in the MCP Tools section header, or register a tool first via the API.

### 3. Configuring MCP Tool Nodes

When you select an MCP tool node, you can configure:

- **Tool Name** - Displayed automatically (read-only)
- **Method** - The selected method name (read-only)
- **Parameters** - JSON object with method parameters

#### Parameter Format

Parameters are entered as JSON. For example:

```json
{
  "query": "What is the capital of France?",
  "maxResults": 5
}
```

### 4. Passing Images and Files to MCP Tools

MCP tools can receive images and files in several ways:

#### Option 1: Base64 Encoding
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### Option 2: File Reference (from previous workflow step)
```json
{
  "fileId": "{{previous_step.file_id}}",
  "imageUrl": "{{previous_step.image_url}}"
}
```

#### Option 3: Direct URL
```json
{
  "imageUrl": "https://example.com/image.png"
}
```

#### Option 4: Using Dependency Outputs

If your MCP tool node depends on a file upload or image extraction node, the file data will automatically be passed as `input`, `text`, `content`, or `result` in the parameters.

### 5. Example: LangchainMCP Agent in Workflow

**Step 1: Register LangchainMCP Tool**
```bash
POST /tools
{
  "name": "langchain_agent",
  "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
  "credit_cost_per_call": 5,
  "protocol": "rest"
}
```

**Step 2: Add to Workflow**
1. Open MCP Tools sidebar
2. Expand "langchain_agent"
3. Select "agent_executor" method
4. Configure parameters:
```json
{
  "query": "Analyze this document and summarize the key points"
}
```

**Step 3: Chain with Other Steps**
- Connect file upload → LangchainMCP agent
- The file content will automatically be passed to the agent

## Workflow Execution

When a workflow with MCP tools is executed:

1. **Tool Resolution** - The system looks up the tool by `tool_id`
2. **Protocol Selection** - Uses the correct protocol (REST/JSON-RPC) automatically
3. **Method Invocation** - Calls the specified method with provided parameters
4. **Result Passing** - Results are passed to dependent nodes

## Supported MCP Tool Types

### External MCP Services (Self-Service)
- **LangchainMCP** - AI agent with multi-step reasoning
- **Any REST-style MCP service** - Services using `/manifest` and `/invoke` endpoints
- **Any JSON-RPC MCP service** - Services using standard MCP JSON-RPC protocol

### Internal Wrapper Tools (Developer Access Required)
- **Playwright Scraper** - Web scraping and interaction
- **Google Places API** - Location and business data
- **DuckDuckGo Search** - Web search results

## Parameter Examples

### LangchainMCP Agent
```json
{
  "query": "What are the main themes in this document?"
}
```

### Playwright Scraper
```json
{
  "url": "https://example.com",
  "extraction_selectors": {
    "title": "h1",
    "content": ".main-content"
  },
  "actions": [
    {
      "type": "click",
      "selector": ".load-more"
    }
  ]
}
```

### Google Places
```json
{
  "query": "coffee shops near me",
  "location": "37.7749,-122.4194",
  "radius": 5000
}
```

## Best Practices

1. **Test Tools First** - Register and test MCP tools before adding to workflows
2. **Handle Errors** - MCP tools may fail; ensure workflows handle errors gracefully
3. **Optimize Parameters** - Only pass necessary parameters to reduce costs
4. **Use Dependencies** - Chain steps properly to pass data between nodes
5. **Monitor Credits** - MCP tools consume credits; monitor usage

## Troubleshooting

### Tool Not Appearing
- Ensure tool is registered and status is "Approved"
- Check that you have proper authentication
- Verify tool-registry-service is running

### Methods Not Loading
- Check tool gateway URL is accessible
- Verify protocol type matches tool implementation
- Check network connectivity

### Execution Fails
- Verify tool_id is correct in node configuration
- Check parameters match method's input schema
- Review job logs for detailed error messages

## API Reference

### Register MCP Tool
```bash
POST /tools
Content-Type: application/json

{
  "name": "tool_name",
  "gateway_url": "https://tool.example.com/mcp",
  "credit_cost_per_call": 1,
  "protocol": "rest" | "json-rpc"
}
```

### Get Tool Methods
```bash
GET /proxy/:toolId/tools
```

### Execute Tool in Workflow
The workflow execution automatically handles MCP tool invocation. No manual API calls needed.

## Next Steps

- Register your first MCP tool
- Create a workflow with MCP tool integration
- Chain multiple MCP tools together
- Pass images and files between steps
