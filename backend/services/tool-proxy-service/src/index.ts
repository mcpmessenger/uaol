import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';
import { errorHandler } from './middleware/error-handler';
import { proxyRoutes } from './routes/proxy';
import { rateLimiter } from './middleware/rate-limiter';

const logger = createLogger('tool-proxy-service');
const app = express();

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.json({
    service: 'tool-proxy-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/proxy', proxyRoutes);

app.use(errorHandler);

const port = config.services.toolProxy.port;

app.listen(port, () => {
  logger.info(`Tool Proxy Service listening on port ${port}`);
});

