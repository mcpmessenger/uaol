# Systems Architecture and Developer Instructions for MCP Tool Integration

## 1. Architectural Overview

The Universal AI Orchestration Layer (UAOL) utilizes a microservices architecture, with the **`tool-proxy-service`** acting as the primary integration point for all external tools and APIs. To integrate new tools—Playwright, Google Places API, and DuckDuckGo Search—we will extend the `tool-proxy-service` to handle new tool types and their specific execution logic.

### Key Architectural Decisions

| Component | Role in New Tool Integration | Technology/Rationale |
| :--- | :--- | :--- |
| **`tool-registry-service`** | Stores metadata for the new tools (e.g., `tool_name: 'playwright_scraper'`, `input_schema`, `output_schema`). | Ensures the orchestration layer is aware of the tool's capabilities. |
| **`job-orchestration-service`** | Routes requests to the `tool-proxy-service` based on the registered tool name. | Standardized request routing. |
| **`tool-proxy-service`** | **Core integration point.** Implements the execution logic for each new tool. | Isolates external tool logic from the core orchestration. |
| **Playwright** | Complex web scraping and interaction requiring a full browser environment. | Requires a robust, potentially separate, execution environment (e.g., a dedicated Docker image with browser dependencies). |
| **Google Places API** | Structured, location-based data retrieval. | Direct HTTP API calls, requiring secure API key management. |
| **DuckDuckGo Search** | Fast, general-purpose web search for quick information retrieval. | Recommended to use a dedicated API or library for speed and to avoid complex scraping. |

## 2. Tool Integration Design

### 2.1. Tool Interface Definition

All new tools must adhere to a standardized request/response interface within the `tool-proxy-service`.

**Tool Request Structure (Input from Job Orchestrator):**

```typescript
interface ToolRequest {
  tool_name: 'playwright_scraper' | 'google_places' | 'duckduckgo_search';
  job_id: string;
  parameters: Record<string, any>; // Tool-specific parameters
}
```

**Tool Response Structure (Output to Job Orchestrator):**

```typescript
interface ToolResponse {
  job_id: string;
  status: 'success' | 'failure';
  result: any; // Structured data from the tool
  error?: string;
}
```

### 2.2. Playwright Integration (`playwright_scraper`)

**Purpose:** Handle complex, dynamic web pages, form submissions, and interactions that simple HTTP requests cannot manage.

**Implementation Details:**
1.  **Execution Environment:** The `tool-proxy-service`'s Dockerfile (or a dedicated sidecar container) must be updated to include Playwright's dependencies (e.g., Node.js, Playwright package, and necessary browser binaries).
2.  **Proxy Logic:** A new handler in `tool-proxy-service/src/tools/playwright.ts` will receive the `ToolRequest`.
3.  **Parameters:** The `parameters` object will include `url`, `actions` (a list of steps like `click`, `type`, `waitForSelector`), and `extraction_selectors`.

### 2.3. Google Places API Integration (`google_places`)

**Purpose:** Retrieve structured, high-quality data about locations, businesses, and points of interest.

**Implementation Details:**
1.  **API Key Management:** The Google Places API key must be securely stored as an environment variable (e.g., `GOOGLE_PLACES_API_KEY`) and accessed by the `tool-proxy-service`.
2.  **Proxy Logic:** A new handler in `tool-proxy-service/src/tools/google_places.ts` will use a library like `axios` to make direct HTTP calls to the Google Places API endpoints (e.g., Text Search, Find Place).
3.  **Parameters:** The `parameters` object will include `query`, `location`, `radius`, and `type`.

### 2.4. DuckDuckGo Search Integration (`duckduckgo_search`)

**Purpose:** Provide a fast, lightweight alternative to Playwright for general search queries, acting as a quick source of up-to-date information.

**Implementation Details:**
1.  **Tool Choice:** We recommend using a non-scraping library like `duckduckgo-api` or a similar dedicated search API wrapper for reliability and speed.
2.  **Proxy Logic:** A new handler in `tool-proxy-service/src/tools/duckduckgo.ts` will wrap the chosen library.
3.  **Decision on Playwright vs. DuckDuckGo:**
    *   **Use DuckDuckGo Search** for: General knowledge, news, simple factual queries, and when speed is critical.
    *   **Use Playwright** for: Interacting with specific websites, logging in, submitting forms, or extracting data from highly dynamic, non-standard layouts.

---

## 3. Developer Instructions

These instructions assume development is focused within the `uaol/backend/services/tool-proxy-service` directory.

### Step 1: Update Dependencies

Navigate to the `tool-proxy-service` directory and install the necessary packages.

```bash
cd uaol/backend/services/tool-proxy-service

# Install Playwright and its browser dependencies
npm install playwright @types/playwright
npx playwright install

# Install a robust HTTP client for Google Places and DuckDuckGo
npm install axios

# Install a library for DuckDuckGo search (e.g., duckduckgo-api)
# Note: Check for the latest, most reliable library for DDG search.
npm install duckduckgo-api
```

### Step 2: Configure Environment Variables

Add the following environment variables to your `.env` file in the `uaol/backend` directory and ensure they are loaded by the `tool-proxy-service`.

```env
# Google Places API Key
GOOGLE_PLACES_API_KEY="YOUR_GOOGLE_PLACES_API_KEY"

# Optional: Configuration for Playwright (e.g., timeout)
PLAYWRIGHT_TIMEOUT_MS=30000
```

### Step 3: Implement Tool Handlers

Create a new directory `src/tools` inside `tool-proxy-service` and implement the logic for each tool.

#### 3.1. Playwright Handler (`src/tools/playwright.ts`)

```typescript
import { chromium } from 'playwright';
import { ToolRequest, ToolResponse } from '../types'; // Assume a types file exists

export async function handlePlaywright(request: ToolRequest): Promise<ToolResponse> {
  const { url, extraction_selectors } = request.parameters;
  const browser = await chromium.launch();
  const page = await browser.newPage();

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
    return { job_id: request.job_id, status: 'success', result: data };
  } catch (error) {
    await browser.close();
    return { job_id: request.job_id, status: 'failure', error: error.message };
  }
}
```

#### 3.2. Google Places Handler (`src/tools/google_places.ts`)

```typescript
import axios from 'axios';
import { ToolRequest, ToolResponse } from '../types';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

export async function handleGooglePlaces(request: ToolRequest): Promise<ToolResponse> {
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
```

#### 3.3. DuckDuckGo Handler (`src/tools/duckduckgo.ts`)

```typescript
import { search } from 'duckduckgo-api'; // Example library
import { ToolRequest, ToolResponse } from '../types';

export async function handleDuckDuckGo(request: ToolRequest): Promise<ToolResponse> {
  const { query } = request.parameters;

  try {
    const results = await search(query, {
      // Example options:
      kl: 'us-en', // Region
      maxResults: 5,
    });

    return { job_id: request.job_id, status: 'success', result: results };
  } catch (error) {
    return { job_id: request.job_id, status: 'failure', error: error.message };
  }
}
```

### Step 4: Integrate Handlers into `tool-proxy-service` Main Logic

Modify the main entry point of the `tool-proxy-service` (e.g., `src/index.ts` or a central router file) to dispatch requests to the new handlers.

```typescript
// Example snippet for src/index.ts in tool-proxy-service

import { handlePlaywright } from './tools/playwright';
import { handleGooglePlaces } from './tools/google_places';
import { handleDuckDuckGo } from './tools/duckduckgo';
import { ToolRequest, ToolResponse } from './types';

// ... existing setup ...

app.post('/execute-tool', async (req, res) => {
  const request: ToolRequest = req.body;
  let response: ToolResponse;

  switch (request.tool_name) {
    case 'playwright_scraper':
      response = await handlePlaywright(request);
      break;
    case 'google_places':
      response = await handleGooglePlaces(request);
      break;
    case 'duckduckgo_search':
      response = await handleDuckDuckGo(request);
      break;
    default:
      response = {
        job_id: request.job_id,
        status: 'failure',
        error: `Unknown tool: ${request.tool_name}`,
      };
  }

  res.json(response);
});

// ... existing cleanup ...
```

### Step 5: Register Tools in `tool-registry-service`

The final step is to register the new tools in the `tool-registry-service`'s database or configuration. This is crucial for the `job-orchestration-service` to know which tools are available and how to call them.

| Field | `playwright_scraper` | `google_places` | `duckduckgo_search` |
| :--- | :--- | :--- | :--- |
| **`name`** | `playwright_scraper` | `google_places` | `duckduckgo_search` |
| **`description`** | Advanced web scraping and interaction using a headless browser. | Structured location and business data retrieval. | Fast, general-purpose web search. |
| **`endpoint`** | `/execute-tool` (on `tool-proxy-service`) | `/execute-tool` (on `tool-proxy-service`) | `/execute-tool` (on `tool-proxy-service`) |
| **`input_schema`** | `{ url: string, extraction_selectors: object }` | `{ query: string, location?: string }` | `{ query: string, maxResults?: number }` |
| **`output_schema`** | `{ [key: string]: string }` | `Array<PlaceResult>` | `Array<SearchResult>` |

Developers should use the existing mechanism in the `tool-registry-service` to add these three new entries.
