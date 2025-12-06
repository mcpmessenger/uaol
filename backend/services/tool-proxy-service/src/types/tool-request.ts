/**
 * Tool Request/Response Types for MCP-Compliant Wrappers
 */

export type ToolName = 'playwright_scraper' | 'google_places' | 'duckduckgo_search';

export interface ToolRequest {
  tool_name: ToolName;
  job_id: string;
  parameters: Record<string, any>;
}

export interface ToolResponse {
  job_id: string;
  status: 'success' | 'failure';
  result?: any;
  error?: string;
}
