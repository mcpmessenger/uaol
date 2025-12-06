/**
 * MCP-Compliant Playwright Wrapper
 * Reads ToolRequest from STDIN and writes ToolResponse to STDOUT
 */

import { chromium } from 'playwright';
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

  const { url, extraction_selectors, actions } = request.parameters;
  if (!url) {
    const errorResponse: ToolResponse = {
      job_id: request.job_id,
      status: 'failure',
      error: 'URL parameter is required',
    };
    console.log(JSON.stringify(errorResponse));
    process.exit(1);
  }

  // Configure Playwright to use system Chromium if available
  // In Docker/Alpine, use the system Chromium path
  const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  let response: ToolResponse;

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Execute actions if provided
    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        switch (action.type) {
          case 'click':
            await page.click(action.selector, { timeout: 5000 });
            break;
          case 'type':
            await page.fill(action.selector, action.text || '', { timeout: 5000 });
            break;
          case 'waitForSelector':
            await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
            break;
          case 'wait':
            await page.waitForTimeout(action.duration || 1000);
            break;
        }
      }
    }

    // Extract data using selectors
    const data: Record<string, string> = {};
    if (extraction_selectors && typeof extraction_selectors === 'object') {
      for (const [key, selector] of Object.entries(extraction_selectors)) {
        try {
          const element = await page.waitForSelector(selector as string, { timeout: 5000 });
          if (element) {
            data[key] = (await element.textContent()) || '';
          }
        } catch (e) {
          // Selector not found, skip
          data[key] = '';
        }
      }
    }

    await browser.close();
    response = {
      job_id: request.job_id,
      status: 'success',
      result: data,
    };
  } catch (error: any) {
    await browser.close();
    response = {
      job_id: request.job_id,
      status: 'failure',
      error: error.message || 'Unknown error occurred',
    };
  }

  // Write the ToolResponse to STDOUT
  console.log(JSON.stringify(response));
  process.exit(0);
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
