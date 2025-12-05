// Load environment variables FIRST, before any other imports
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded from backend directory BEFORE any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env');

console.log('[Auth] Loading .env from:', envPath);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('[Auth] Error loading .env:', envResult.error);
} else {
  console.log('[Auth] .env loaded successfully');
  console.log('[Auth] DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
}

// NOW import other modules (after .env is loaded)
import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('auth-service');
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// CRITICAL: Import routes AFTER .env is loaded to prevent connection module from loading too early
(async () => {
  const { errorHandler } = await import('./middleware/error-handler');
  const { authRoutes } = await import('./routes/auth');
  const { userRoutes } = await import('./routes/user');
  
  // Routes
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  
  // Error handling
  app.use(errorHandler);

  const port = config.services.auth.port;

  app.listen(port, () => {
    logger.info(`Auth Service listening on port ${port}`);
  });
})();

