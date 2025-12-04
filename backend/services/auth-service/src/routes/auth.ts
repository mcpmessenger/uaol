import { Router } from 'express';
import { authController } from '../controllers/auth-controller';
import { authenticate } from '../middleware/authenticate';

export const authRoutes = Router();

// OAuth routes
authRoutes.get('/google', authController.initiateGoogleOAuth);
authRoutes.get('/google/callback', authController.handleGoogleCallback);

// API Key routes
authRoutes.post('/api-key/regenerate', authenticate, authController.regenerateApiKey);
authRoutes.get('/api-key', authenticate, authController.getApiKey);

// Session routes
authRoutes.post('/login', authController.login);
authRoutes.post('/logout', authenticate, authController.logout);
authRoutes.get('/me', authenticate, authController.getCurrentUser);

