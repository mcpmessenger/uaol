/**
 * Wrapper Dispatcher Service
 * Executes MCP-compliant wrapper scripts as child processes
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { ToolRequest, ToolResponse } from '../types/tool-request';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('wrapper-dispatcher');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Map tool names to their wrapper script paths
const WRAPPER_MAP: Record<string, string> = {
  playwright_scraper: resolve(__dirname, '../wrappers/playwright-mcp-wrapper.ts'),
  google_places: resolve(__dirname, '../wrappers/google-places-mcp-wrapper.ts'),
  duckduckgo_search: resolve(__dirname, '../wrappers/duckduckgo-mcp-wrapper.ts'),
};

/**
 * Executes an MCP-compliant wrapper script as a child process.
 * @param request The ToolRequest object
 * @returns A promise that resolves to the ToolResponse
 */
export async function executeWrapper(request: ToolRequest): Promise<ToolResponse> {
  const wrapperPath = WRAPPER_MAP[request.tool_name];

  if (!wrapperPath) {
    return {
      job_id: request.job_id,
      status: 'failure',
      error: `Unknown tool: ${request.tool_name}`,
    };
  }

  return new Promise((resolve) => {
    logger.info(`Executing wrapper for tool: ${request.tool_name}`, { jobId: request.job_id });

    // Use 'tsx' to execute the TypeScript wrapper script
    const child = spawn('tsx', [wrapperPath], {
      cwd: resolve(__dirname, '../../..'), // Ensure the child process runs in the correct directory
      env: { ...process.env }, // Pass environment variables
      stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
    });

    let output = '';
    let errorOutput = '';

    // Pipe the ToolRequest JSON to the wrapper's STDIN
    const requestJson = JSON.stringify(request);
    child.stdin.write(requestJson, 'utf8');
    child.stdin.end();

    // Capture the wrapper's STDOUT (the ToolResponse)
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Capture the wrapper's STDERR for debugging/error reporting
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger.warn(`Wrapper stderr for ${request.tool_name}:`, { stderr: data.toString() });
    });

    child.on('error', (error) => {
      logger.error(`Failed to spawn wrapper process for ${request.tool_name}:`, error);
      resolve({
        job_id: request.job_id,
        status: 'failure',
        error: `Failed to execute wrapper: ${error.message}`,
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          // The wrapper should output a single JSON object (ToolResponse)
          const response: ToolResponse = JSON.parse(output.trim());
          logger.info(`Wrapper execution successful for ${request.tool_name}`, {
            jobId: request.job_id,
            status: response.status,
          });
          resolve(response);
        } catch (e: any) {
          logger.error(`Failed to parse wrapper output for ${request.tool_name}:`, {
            output,
            error: e.message,
          });
          resolve({
            job_id: request.job_id,
            status: 'failure',
            error: `Wrapper output parsing failed. STDOUT: ${output}. STDERR: ${errorOutput}`,
          });
        }
      } else {
        logger.error(`Wrapper process exited with code ${code} for ${request.tool_name}`, {
          stderr: errorOutput,
        });
        resolve({
          job_id: request.job_id,
          status: 'failure',
          error: `Wrapper process exited with code ${code}. STDERR: ${errorOutput}`,
        });
      }
    });
  });
}
