# Model Context Protocol (MCP) Client Update: Dual Protocol Support

This document outlines the changes made to the `MCPClient` in the `uaol` backend to support both the original **JSON-RPC** style MCP and the newer **REST** style MCP, as exemplified by the `LangchainMCP` service.

## Rationale

The existing `MCPClient` was designed for the JSON-RPC style protocol, which uses a single `POST` endpoint (`/`) with a JSON payload specifying the `method` (`tools/call` or `tools/list`).

External services like `LangchainMCP` use a more RESTful approach with dedicated endpoints:
*   **Manifest/List Tools:** `GET /mcp/manifest`
*   **Invoke/Call Tool:** `POST /mcp/invoke`

To make the UAOL application **robust** and enable **self-service tool registration** for external MCP services, the `MCPClient` has been refactored to use an **Adapter Pattern**.

## Implementation Details

### 1. Adapter Pattern Introduction

A new file, `uaol/backend/shared/mcp/adapters.ts`, was created to house the protocol-specific logic:

*   **`IMCPProtocolAdapter` Interface:** Defines the common methods (`listTools`, `callTool`) that all protocol implementations must adhere to.
*   **`JsonRpcAdapter`:** Implements the logic for the original JSON-RPC style.
*   **`RestAdapter`:** Implements the logic for the new REST style, handling the `/manifest` and `/invoke` endpoints.

### 2. `MCPClient` Refactoring

The `uaol/backend/shared/mcp/client.ts` file was updated:

*   The `MCPClient` now accepts an optional `protocol` parameter (`'json-rpc'` or `'rest'`) in its constructor, which defaults to `'json-rpc'` for backward compatibility.
*   Based on the `protocol` parameter, it instantiates the appropriate adapter (`JsonRpcAdapter` or `RestAdapter`).
*   The public methods (`callTool`, `listTools`) simply delegate the call to the selected adapter.

### 3. Database and Service Layer Updates

*   **`MCPTool` Model (`uaol/backend/shared/database/models/mcp-tool.ts`):**
    *   The `MCPTool` interface and the `MCPToolModel` methods were updated to include a new `protocol` field.
    *   This field is stored in the database and defaults to `'json-rpc'` when a new tool is registered without specifying a protocol.
*   **`Tool Proxy Controller` (`uaol/backend/services/tool-proxy-service/src/controllers/proxy-controller.ts`):**
    *   The controller now retrieves the `protocol` from the `tool` object fetched from the database.
    *   It passes this `tool.protocol` directly to the `MCPClient` constructor, ensuring the correct communication method is used for each tool.

## Next Steps

The next phase will focus on creating the self-service guide for Eddie, which will explain how to register external tools and specify the correct protocol. This will complete the self-service model you envisioned.
