/**
 * MCP-Compliant DuckDuckGo Search Wrapper
 * Reads ToolRequest from STDIN and writes ToolResponse to STDOUT
 */

import { DuckDuckGoSearch } from '@phukon/duckduckgo-search';
import { ToolRequest, ToolResponse } from '../types/tool-request';

async function runWrapper() {
  let request: ToolRequest;
  try {
    // Read the ToolRequest from STDIN
    const input = await new Promise<string>((resolve) => {
      process.stdin.setEncoding('utf8');
      let data = '';
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => resolve(data));
    });
    request = JSON.parse(input);
  } catch (e: any) {
    const errorResponse: ToolResponse = {
      job_id: 'unknown',
      status: 'failure',
      error: `Invalid ToolRequest JSON input: ${e.message}`,
    };
    console.log(JSON.stringify(errorResponse));
    process.exit(1);
  }

  const { query, maxResults } = request.parameters;

  if (!query) {
    const errorResponse: ToolResponse = {
      job_id: request.job_id,
      status: 'failure',
      error: 'Query parameter is required',
    };
    console.log(JSON.stringify(errorResponse));
    process.exit(1);
  }

  try {
    const ddg = new DuckDuckGoSearch();
    const results = await ddg.text({
      query: query,
      maxResults: maxResults || 5,
    });

    const formattedResults = results.map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      description: result.description || '',
    }));

    const response: ToolResponse = {
      job_id: request.job_id,
      status: 'success',
      result: formattedResults,
    };
    console.log(JSON.stringify(response));
    process.exit(0);
  } catch (error: any) {
    const errorResponse: ToolResponse = {
      job_id: request.job_id,
      status: 'failure',
      error: error.message || 'Unknown error occurred',
    };
    console.log(JSON.stringify(errorResponse));
    process.exit(1);
  }
}

runWrapper().catch((error) => {
  const errorResponse: ToolResponse = {
    job_id: 'unknown',
    status: 'failure',
    error: `Wrapper execution failed: ${error.message}`,
  };
  console.log(JSON.stringify(errorResponse));
  process.exit(1);
});
