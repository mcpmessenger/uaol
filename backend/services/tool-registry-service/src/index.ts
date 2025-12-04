import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';
import { errorHandler } from './middleware/error-handler';
import { toolRoutes } from './routes/tools';
import { authenticate } from './middleware/authenticate';

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

app.use('/tools', toolRoutes);

app.use(errorHandler);

const port = config.services.toolRegistry.port;

app.listen(port, () => {
  logger.info(`Tool Registry Service listening on port ${port}`);
});

