// Load environment variables FIRST, before any other imports
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded from backend directory BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env');

console.log('[Job-Orch] Loading .env from:', envPath);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('[Job-Orch] Error loading .env:', envResult.error);
} else {
  console.log('[Job-Orch] .env loaded successfully');
  console.log('[Job-Orch] DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
  if (process.env.DATABASE_URL) {
    const urlForLogging = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
    console.log('[Job-Orch] DATABASE_URL value:', urlForLogging.substring(0, 80) + '...');
  }
}

// NOW import other modules (after .env is loaded)
import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';

// CRITICAL: Force config getter to execute and log what it sees
process.stdout.write(`[Job-Orch] About to access config.database.url...\n`);
process.stdout.write(`[Job-Orch] process.env.DATABASE_URL BEFORE config access: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}\n`);
if (process.env.DATABASE_URL) {
  const urlForLogging = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  process.stdout.write(`[Job-Orch] process.env.DATABASE_URL value: ${urlForLogging.substring(0, 60)}...\n`);
}

// Verify config has the right DATABASE_URL
const configUrl = config.database.url;
process.stdout.write(`[Job-Orch] Config returned URL: ${configUrl.includes('localhost') ? 'LOCALHOST' : 'REMOTE'}\n`);
console.log('[Job-Orch] Config DATABASE_URL:', configUrl.includes('localhost') ? '⚠️ LOCALHOST (WRONG!)' : '✅ Correct');
if (configUrl.includes('localhost')) {
  console.error('[Job-Orch] ERROR: Config is using localhost! This means .env was not loaded before config import.');
  console.error('[Job-Orch] process.env.DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
}

// Routes and job processor will be imported dynamically in the async IIFE below

const logger = createLogger('job-orchestration-service');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    service: 'job-orchestration-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// CRITICAL: Import routes AFTER .env is loaded to prevent connection module from loading too early
(async () => {
  const { errorHandler } = await import('./middleware/error-handler');
  const { jobRoutes } = await import('./routes/jobs');
  const { jobProcessor } = await import('./services/job-processor');
  
  app.use('/jobs', jobRoutes);
  app.use(errorHandler);

  // Start job processor
  jobProcessor.start();

  const port = config.services.jobOrchestration.port;

  app.listen(port, () => {
    logger.info(`Job Orchestration Service listening on port ${port}`);
  });
})();

