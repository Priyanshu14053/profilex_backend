import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.register(req.body);
      sendSuccess(res, 'User registered successfully', user, 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const forwarded = req.headers['x-forwarded-for'];
      const ip_address = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || req.ip;
      const user_agent = req.headers['user-agent'] as string | undefined;

      const result = await this.service.login(req.body, { ip_address, user_agent });
      sendSuccess(res, 'Login successful', result, 200);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, 'Logout successful', undefined, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
