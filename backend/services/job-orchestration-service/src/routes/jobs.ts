import { Router } from 'express';
import { jobController } from '../controllers/job-controller';
import { authenticate } from '../middleware/authenticate';

export const jobRoutes = Router();

jobRoutes.use(authenticate);

jobRoutes.post('/', jobController.createJob);
jobRoutes.get('/', jobController.listJobs);
jobRoutes.get('/:jobId', jobController.getJob);
jobRoutes.post('/:jobId/cancel', jobController.cancelJob);

