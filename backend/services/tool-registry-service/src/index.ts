// Load environment variables FIRST, before any other imports
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded from backend directory BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env');

console.log('[Tool-Registry] Loading .env from:', envPath);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('[Tool-Registry] Error loading .env:', envResult.error);
} else {
  console.log('[Tool-Registry] .env loaded successfully');
  console.log('[Tool-Registry] DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
}

// NOW import other modules (after .env is loaded)
import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('tool-registry-service');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    service: 'tool-registry-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// CRITICAL: Import routes AFTER .env is loaded to prevent connection module from loading too early
// Use dynamic import to ensure .env is fully loaded before routes (which import middleware, which imports connection)
(async () => {
  const { toolRoutes } = await import('./routes/tools');
  const { errorHandler } = await import('./middleware/error-handler');
  
  app.use('/tools', toolRoutes);
  app.use(errorHandler);

  const port = config.services.toolRegistry.port;

  app.listen(port, () => {
    logger.info(`Tool Registry Service listening on port ${port}`);
  });
})();

