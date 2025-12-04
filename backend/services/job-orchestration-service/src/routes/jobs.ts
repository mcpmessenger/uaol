import { Router } from 'express';
import { jobController } from '../controllers/job-controller';
import { optionalAuthenticate } from '@uaol/shared/auth/optional-authenticate';

export const jobRoutes = Router();

// Use optional auth to support both authenticated users and guests
jobRoutes.use(optionalAuthenticate);

jobRoutes.post('/', jobController.createJob);
jobRoutes.get('/', jobController.listJobs);
jobRoutes.get('/:jobId', jobController.getJob);
jobRoutes.post('/:jobId/cancel', jobController.cancelJob);

