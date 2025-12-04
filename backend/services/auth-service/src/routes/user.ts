import { Router } from 'express';
import { userController } from '../controllers/user-controller';
import { authenticate } from '../middleware/authenticate';

export const userRoutes = Router();

userRoutes.use(authenticate);

userRoutes.get('/profile', userController.getProfile);
userRoutes.put('/profile', userController.updateProfile);
userRoutes.get('/credits', userController.getCredits);
userRoutes.get('/subscription', userController.getSubscription);
userRoutes.put('/subscription', userController.updateSubscription);

