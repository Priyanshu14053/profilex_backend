import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { registerValidator, loginValidator } from '../validators/auth.validator';
import { authenticateToken } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Registration route with strict rate limit and field validation
router.post('/register', authLimiter, registerValidator, authController.register);

// Login route with strict rate limit and validation
router.post('/login', authLimiter, loginValidator, authController.login);

// Logout route (requires JWT authentication)
router.post('/logout', authenticateToken, authController.logout);

export default router;
