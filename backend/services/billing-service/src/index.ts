import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';
import { errorHandler } from './middleware/error-handler';
import { billingRoutes } from './routes/billing';
import { creditRoutes } from './routes/credits';

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

app.use('/billing', billingRoutes);
app.use('/credits', creditRoutes);

app.use(errorHandler);

const port = config.services.billing.port;

app.listen(port, () => {
  logger.info(`Billing Service listening on port ${port}`);
});

