// Load environment variables FIRST, before any other imports
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded from backend directory BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env');

console.log('[Billing] Loading .env from:', envPath);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('[Billing] Error loading .env:', envResult.error);
} else {
  console.log('[Billing] .env loaded successfully');
  console.log('[Billing] DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
}

// NOW import other modules (after .env is loaded)
import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('billing-service');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    service: 'billing-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// CRITICAL: Import routes AFTER .env is loaded to prevent connection module from loading too early
(async () => {
  const { errorHandler } = await import('./middleware/error-handler');
  const { billingRoutes } = await import('./routes/billing');
  const { creditRoutes } = await import('./routes/credits');
  
  app.use('/billing', billingRoutes);
  app.use('/credits', creditRoutes);
  app.use(errorHandler);

  const port = config.services.billing.port;

  app.listen(port, () => {
    logger.info(`Billing Service listening on port ${port}`);
  });
})();

