import { userRepository, UserRepository } from '../repositories/user.repository';
import { ConflictError, NotFoundError } from '../utils/errors';
import { UserProfileResponse, UserUpdateInput } from '../models/user.model';

export class ProfileService {
  constructor(private userRepo: UserRepository = userRepository) {}

  /**
   * Retrieves profile for the authenticated user by their token userId
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      dob: String(user.dob).split('T')[0],
      username: user.username,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  /**
   * Updates profile fields (name, mobile, dob, username).
   * Email cannot be updated and client-provided user IDs are strictly ignored.
   */
  async updateProfile(userId: string, updateData: UserUpdateInput): Promise<UserProfileResponse> {
    // 1. Verify user exists
    const currentUser = await this.userRepo.findById(userId);
    if (!currentUser) {
      throw new NotFoundError('User profile not found');
    }

    const normalizedUsername = updateData.username.trim().toLowerCase();
    const normalizedMobile = updateData.mobile.trim();

    // 2. Check if username is taken by another account
    const existingUsername = await this.userRepo.findByUsernameExcludingId(
      normalizedUsername,
      userId
    );
    if (existingUsername) {
      throw new ConflictError('Username is already taken');
    }

    // 3. Check if mobile is registered to another account
    const existingMobile = await this.userRepo.findByMobileExcludingId(
      normalizedMobile,
      userId
    );
    if (existingMobile) {
      throw new ConflictError('Mobile number is already registered');
    }

    // 4. Perform update
    const updatedUser = await this.userRepo.update(userId, {
      name: updateData.name.trim(),
      mobile: normalizedMobile,
      dob: updateData.dob.trim(),
      username: normalizedUsername,
    });

    if (!updatedUser) {
      throw new NotFoundError('User profile not found after update');
    }

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      dob: String(updatedUser.dob).split('T')[0],
      username: updatedUser.username,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    };
  }
}

export const profileService = new ProfileService();
