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
import { errorHandler } from './middleware/error-handler';
import { jobRoutes } from './routes/jobs';

// Verify config has the right DATABASE_URL
console.log('[Job-Orch] Config DATABASE_URL:', config.database.url.includes('localhost') ? '⚠️ LOCALHOST (WRONG!)' : '✅ Correct');
if (config.database.url.includes('localhost')) {
  console.error('[Job-Orch] ERROR: Config is using localhost! This means .env was not loaded before config import.');
  console.error('[Job-Orch] process.env.DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
}

// Import job processor AFTER verifying config
import { jobProcessor } from './services/job-processor';

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

app.use('/jobs', jobRoutes);

app.use(errorHandler);

// Start job processor
jobProcessor.start();

const port = config.services.jobOrchestration.port;

app.listen(port, () => {
  logger.info(`Job Orchestration Service listening on port ${port}`);
});

