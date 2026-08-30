import { Request, Response, NextFunction } from 'express';
import { profileService, ProfileService } from '../services/profile.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';

export class ProfileController {
  constructor(private service: ProfileService = profileService) {}

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Unauthorized');
      }
      const profile = await this.service.getProfile(req.userId);
      sendSuccess(res, 'Profile retrieved successfully', profile, 200);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Unauthorized');
      }
      const updated = await this.service.updateProfile(req.userId, req.body);
      sendSuccess(res, 'Profile updated successfully', updated, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const profileController = new ProfileController();
