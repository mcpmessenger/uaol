import { Router } from 'express';
import { apiKeyController } from '../controllers/api-key-controller.js';
import { optionalAuthenticate } from '@uaol/shared/auth/optional-authenticate';

const router = Router();

// All routes require authentication (not guest mode)
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isGuest) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required. Please sign in to manage API keys.',
      },
    });
  }
  next();
};

// Apply optionalAuthenticate first (to get user/guest), then requireAuth (to reject guests)
router.use(optionalAuthenticate);
router.use(requireAuth);

// Routes
router.post('/', apiKeyController.createOrUpdate);
router.get('/', apiKeyController.list);
router.get('/:provider', apiKeyController.getByProvider);
router.put('/:provider/default', apiKeyController.setDefault);
router.delete('/:provider', apiKeyController.delete);

export default router;
