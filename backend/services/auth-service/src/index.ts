import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';
import { errorHandler } from './middleware/error-handler';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';

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

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

// Error handling
app.use(errorHandler);

const port = config.services.auth.port;

app.listen(port, () => {
  logger.info(`Auth Service listening on port ${port}`);
});

