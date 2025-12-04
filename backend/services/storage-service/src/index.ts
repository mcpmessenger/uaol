import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';
import { errorHandler } from './middleware/error-handler';
import { storageRoutes } from './routes/storage';

const logger = createLogger('storage-service');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({
    service: 'storage-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/storage', storageRoutes);

app.use(errorHandler);

const port = config.services.storage.port;

app.listen(port, () => {
  logger.info(`Storage Service listening on port ${port}`);
});

