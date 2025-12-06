/**
 * MCP-Compliant Google Places API Wrapper
 * Reads ToolRequest from STDIN and writes ToolResponse to STDOUT
 */

import axios from 'axios';
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

  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  const BASE_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  const { query, location, radius, type } = request.parameters;

  if (!API_KEY) {
    const errorResponse: ToolResponse = {
      job_id: request.job_id,
      status: 'failure',
      error: 'GOOGLE_PLACES_API_KEY is not set in environment variables',
    };
    console.log(JSON.stringify(errorResponse));
    process.exit(1);
  }

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
    const params: Record<string, any> = {
      query: query,
      key: API_KEY,
    };

    if (location) {
      params.location = location;
    }
    if (radius) {
      params.radius = radius;
    }
    if (type) {
      params.type = type;
    }

    const response = await axios.get(BASE_URL, {
      params,
      timeout: 10000,
    });

    const result: ToolResponse = {
      job_id: request.job_id,
      status: 'success',
      result: response.data.results || [],
    };
    console.log(JSON.stringify(result));
    process.exit(0);
  } catch (error: any) {
    const errorResponse: ToolResponse = {
      job_id: request.job_id,
      status: 'failure',
      error: error.response?.data?.error_message || error.message || 'Unknown error occurred',
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
