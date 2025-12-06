# Systems Architecture and Developer Instructions for MCP Tool Integration (Revised)

## 1. Architectural Overview: The MCP-Compliant Wrapper Approach

The Universal AI Orchestration Layer (UAOL) is built around the Model Context Protocol (MCP), which mandates a standardized interface for tool communication. Following the user's direction, we will adopt the **MCP-Compliant Wrapper** pattern. This approach treats each external tool (Playwright, Google Places API, DuckDuckGo Search) as a standalone, executable script that adheres strictly to the MCP's input/output specification.

The **`tool-proxy-service`** will transition from being the direct handler of the tool logic to a **generic dispatcher**. Its primary role will be to receive the standardized `ToolRequest` from the `job-orchestration-service`, execute the corresponding MCP-compliant wrapper script as a child process, and return the wrapper's standardized `ToolResponse`.

### Key Architectural Decisions (Revised)

| Component | Role in New Tool Integration | Technology/Rationale |
| :--- | :--- | :--- |
| **MCP-Compliant Wrapper** | **Core Tool Logic.** A dedicated script for each tool that encapsulates all external API calls and business logic. | Enforces strict adherence to the MCP interface (JSON in, JSON out), making tools portable and easily testable. |
| **`tool-proxy-service`** | **Generic Dispatcher.** Receives `ToolRequest`, executes the appropriate wrapper script (e.g., via `child_process.spawn`), and relays the `ToolResponse`. | Decouples the proxy service from specific tool dependencies and logic, simplifying maintenance. |
| **Playwright Wrapper** | Executes complex web interactions within a dedicated environment. | Requires a robust execution environment (e.g., Docker with browser dependencies) to run the wrapper script. |
| **Google Places API Wrapper** | Handles secure API key management and structured data retrieval. | Wrapper script handles API key injection and response formatting. |
| **DuckDuckGo Search Wrapper** | Provides fast, general-purpose search results. | Wrapper script uses a dedicated library to ensure speed and reliability. |

## 2. Tool Integration Design: The Wrapper Interface

The standardized interface remains crucial, but the implementation shifts from an Express handler to a command-line executable wrapper.

**Wrapper Input (via STDIN or File):** The wrapper script receives the `ToolRequest` JSON.

```typescript
interface ToolRequest {
  tool_name: 'playwright_scraper' | 'google_places' | 'duckduckgo_search';
  job_id: string;
  parameters: Record<string, any>; // Tool-specific parameters
}
```

**Wrapper Output (via STDOUT):** The wrapper script prints the `ToolResponse` JSON to standard output.

```typescript
interface ToolResponse {
  job_id: string;
  status: 'success' | 'failure';
  result: any; // Structured data from the tool
  error?: string;
}
```

## 3. Developer Instructions

These instructions focus on creating the MCP-compliant wrappers and updating the `tool-proxy-service` to dispatch to them.

### Step 1: Update Dependencies and Install Wrappers

Navigate to the `tool-proxy-service` directory and install the necessary packages.

```bash
cd uaol/backend/services/tool-proxy-service

# Install Playwright and its browser dependencies
npm install playwright @types/playwright
npx playwright install

# Install HTTP client and DuckDuckGo library
npm install axios duckduckgo-api
```

### Step 2: Configure Environment Variables

Ensure the following environment variables are securely configured in the `uaol/backend/.env` file and accessible by the `tool-proxy-service`.

```env
# Google Places API Key
GOOGLE_PLACES_API_KEY="YOUR_GOOGLE_PLACES_API_KEY"
```

### Step 3: Implement MCP-Compliant Tool Wrappers

Create a new directory `src/wrappers` inside `tool-proxy-service` and implement the logic for each tool as a standalone script. These scripts will read from STDIN and write to STDOUT.

#### 3.1. Playwright Wrapper (`src/wrappers/playwright-mcp-wrapper.ts`)

This script will read the `ToolRequest` from STDIN, execute the Playwright logic, and print the `ToolResponse` to STDOUT.

```typescript
// src/wrappers/playwright-mcp-wrapper.ts
import { chromium } from 'playwright';
import { ToolRequest, ToolResponse } from '../types'; // Assume types file exists

async function runWrapper() {
  let request: ToolRequest;
  try {
    // Read the ToolRequest from STDIN
    const input = await new Promise<string>(resolve => {
      process.stdin.setEncoding('utf8');
      let data = '';
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data));
    });
    request = JSON.parse(input);
  } catch (e) {
    console.log(JSON.stringify({ status: 'failure', error: 'Invalid ToolRequest JSON input.' }));
    return;
  }

  const { url, extraction_selectors } = request.parameters;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let response: ToolResponse;

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    const data = {};
    for (const [key, selector] of Object.entries(extraction_selectors)) {
      const element = await page.waitForSelector(selector, { timeout: 5000 });
      if (element) {
        data[key] = await element.textContent();
      }
    }

    await browser.close();
    response = { job_id: request.job_id, status: 'success', result: data };
  } catch (error) {
    await browser.close();
    response = { job_id: request.job_id, status: 'failure', error: error.message };
  }

  // Write the ToolResponse to STDOUT
  console.log(JSON.stringify(response));
}

runWrapper();
```

#### 3.2. Google Places Wrapper (`src/wrappers/google-places-mcp-wrapper.ts`)

```typescript
// src/wrappers/google-places-mcp-wrapper.ts
import axios from 'axios';
import { ToolRequest, ToolResponse } from '../types';

// ... (Wrapper setup to read request from STDIN, similar to Playwright) ...

async function handleGooglePlaces(request: ToolRequest): Promise<ToolResponse> {
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  const BASE_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  const { query } = request.parameters;

  if (!API_KEY) {
    return { job_id: request.job_id, status: 'failure', error: 'GOOGLE_PLACES_API_KEY is not set.' };
  }

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        query: query,
        key: API_KEY,
      },
    });

    return { job_id: request.job_id, status: 'success', result: response.data.results };
  } catch (error) {
    return { job_id: request.job_id, status: 'failure', error: error.message };
  }
}

// ... (Wrapper cleanup to write response to STDOUT) ...
```

### Step 4: Integrate Dispatcher Logic into `tool-proxy-service`

Modify the main entry point of the `tool-proxy-service` (e.g., `src/index.ts`) to use a generic dispatcher function that executes the wrapper scripts.

```typescript
// Example snippet for src/index.ts in tool-proxy-service

import { spawn } from 'child_process';
import { ToolRequest, ToolResponse } from './types';

// ... existing setup ...

/**
 * Executes an MCP-compliant wrapper script as a child process.
 * @param wrapperPath The path to the wrapper script (e.g., './wrappers/playwright-mcp-wrapper.ts')
 * @param request The ToolRequest object
 * @returns A promise that resolves to the ToolResponse
 */
function executeWrapper(wrapperPath: string, request: ToolRequest): Promise<ToolResponse> {
  return new Promise((resolve) => {
    // Use 'tsx' to execute the TypeScript wrapper script
    const child = spawn('tsx', [wrapperPath], {
      cwd: __dirname, // Ensure the child process runs in the correct directory
      env: process.env,
    });

    let output = '';
    let errorOutput = '';

    // Pipe the ToolRequest JSON to the wrapper's STDIN
    child.stdin.write(JSON.stringify(request));
    child.stdin.end();

    // Capture the wrapper's STDOUT (the ToolResponse)
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Capture the wrapper's STDERR for debugging/error reporting
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          // The wrapper should output a single JSON object (ToolResponse)
          const response: ToolResponse = JSON.parse(output);
          resolve(response);
        } catch (e) {
          resolve({
            job_id: request.job_id,
            status: 'failure',
            error: `Wrapper output parsing failed. STDOUT: ${output}. STDERR: ${errorOutput}`,
          });
        }
      } else {
        resolve({
          job_id: request.job_id,
          status: 'failure',
          error: `Wrapper process exited with code ${code}. STDERR: ${errorOutput}`,
        });
      }
    });
  });
}

app.post('/execute-tool', async (req, res) => {
  const request: ToolRequest = req.body;
  let response: ToolResponse;

  const wrapperMap = {
    'playwright_scraper': './wrappers/playwright-mcp-wrapper.ts',
    'google_places': './wrappers/google-places-mcp-wrapper.ts',
    'duckduckgo_search': './wrappers/duckduckgo-mcp-wrapper.ts',
  };

  const wrapperPath = wrapperMap[request.tool_name];

  if (wrapperPath) {
    response = await executeWrapper(wrapperPath, request);
  } else {
    response = {
      job_id: request.job_id,
      status: 'failure',
      error: `Unknown tool: ${request.tool_name}`,
    };
  }

  res.json(response);
});
```

### Step 5: Register Tools in `tool-registry-service`

The registration process remains the same, as the external interface to the `tool-proxy-service` has not changed.

| Field | `playwright_scraper` | `google_places` | `duckduckgo_search` |
| :--- | :--- | :--- | :--- |
| **`name`** | `playwright_scraper` | `google_places` | `duckduckgo_search` |
| **`description`** | Advanced web scraping and interaction using a headless browser. | Structured location and business data retrieval. | Fast, general-purpose web search. |
| **`endpoint`** | `/execute-tool` (on `tool-proxy-service`) | `/execute-tool` (on `tool-proxy-service`) | `/execute-tool` (on `tool-proxy-service`) |
| **`input_schema`** | `{ url: string, extraction_selectors: object }` | `{ query: string, location?: string }` | `{ query: string, maxResults?: number }` |
| **`output_schema`** | `{ [key: string]: string }` | `Array<PlaceResult>` | `Array<SearchResult>` |

Developers should use the existing mechanism in the `tool-registry-service` to add these three new entries.
