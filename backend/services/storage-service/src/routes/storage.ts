import { Router } from 'express';
import { storageController } from '../controllers/storage-controller';
import { authenticate } from '../middleware/authenticate';

export const storageRoutes = Router();

storageRoutes.use(authenticate);

storageRoutes.post('/upload', storageController.uploadFile);
storageRoutes.get('/presigned-url', storageController.generatePresignedUrl);
storageRoutes.get('/files', storageController.listFiles);
storageRoutes.get('/files/:fileId', storageController.getFile);
storageRoutes.delete('/files/:fileId', storageController.deleteFile);

