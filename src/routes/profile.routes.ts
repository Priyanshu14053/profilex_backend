import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { updateProfileValidator } from '../validators/profile.validator';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Profile endpoints require authentication
router.get('/', authenticateToken, profileController.getProfile);
router.put('/', authenticateToken, updateProfileValidator, profileController.updateProfile);

export default router;
