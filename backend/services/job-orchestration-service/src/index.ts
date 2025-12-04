import express from 'express';
import cors from 'cors';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';
import { errorHandler } from './middleware/error-handler';
import { jobRoutes } from './routes/jobs';
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

