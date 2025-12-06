# Self-Service Guide: Registering External MCP Tools

**Author:** Manus AI
**Date:** December 5, 2025

## Introduction: The Robust Tool Registry

The UAOL application has been updated to support a more robust and flexible Model Context Protocol (MCP) tool registry. This enhancement enables a **self-service model**, allowing external MCP services—like the `LangchainMCP` deployed on Google Cloud Run—to be registered via a simple API call without requiring any code changes in the core UAOL application.

This guide provides the necessary information for registering new tools, particularly focusing on the distinction between the two supported MCP communication protocols: **JSON-RPC** and **REST**.

## Understanding MCP Protocols

The core difference between the two protocols lies in how the tool's methods are invoked and how the tool's manifest is retrieved. The UAOL `MCPClient` now uses an **Adapter Pattern** to automatically handle the correct communication style based on the protocol specified during registration.

| Feature | JSON-RPC (Legacy/Internal) | REST (Modern/External) |
| :--- | :--- | :--- |
| **Tool Manifest** | Handled internally by the tool-proxy-service | `GET {gateway_url}/manifest` |
| **Tool Invocation** | `POST {gateway_url}` with `{"method": "tools/call", ...}` | `POST {gateway_url}/invoke` with tool name and arguments in body |
| **Endpoint** | Single endpoint for all calls | Dedicated endpoints for manifest and invoke |
| **Protocol Field** | `json-rpc` (Default) | `rest` |
| **Example** | Internal wrappers (e.g., Playwright) | `LangchainMCP` service |

## Step-by-Step Registration Guide

To register a new external MCP tool, you must make a `POST` request to the `tool-registry-service` API. The key addition to the payload is the optional `protocol` field.

### API Endpoint

```
POST /tools
Host: [Your tool-registry-service URL]
Content-Type: application/json
```

### Request Body Schema

The request body must be a JSON object containing the following fields:

| Field | Type | Description | Required | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | A unique, human-readable name for the tool. | Yes | `"langchain_agent"` |
| `gateway_url` | string | The base URL for the MCP service. | Yes | `"https://langchain-agent-mcp-server.../mcp"` |
| `credit_cost_per_call` | number | The cost in credits for a single invocation of the tool. | Yes | `5` |
| `protocol` | string | **The communication protocol to use.** Must be either `"json-rpc"` or `"rest"`. Defaults to `"json-rpc"` if omitted. | No | `"rest"` |

### Example: Registering the LangchainMCP Service

To register the external `LangchainMCP` service, which uses the REST-style protocol, the request body should look like this:

```json
{
  "name": "langchain_agent",
  "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
  "credit_cost_per_call": 5,
  "protocol": "rest"
}
```

**Note:** The `gateway_url` should point to the base path that handles the MCP endpoints (e.g., the URL before `/manifest` or `/invoke`).

### Key Takeaway for Self-Service

For any new external MCP service that follows the modern REST-style protocol (using `/manifest` and `/invoke` endpoints), you **MUST** include `"protocol": "rest"` in the registration payload. If the tool uses the older JSON-RPC style, you can either omit the field or explicitly set it to `"json-rpc"`.

This change ensures that the UAOL application can seamlessly integrate with a wider ecosystem of MCP tools, making the tool registry truly self-service and robust.
