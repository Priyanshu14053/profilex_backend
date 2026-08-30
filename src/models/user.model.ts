import { RowDataPacket } from 'mysql2';

export interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  mobile: string;
  dob: string;
  username: string;
  password_hash: string;
  failed_attempts: number;
  is_locked: number | boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  dob: string;
  username: string;
  password_hash: string;
  failed_attempts?: number;
  is_locked?: number | boolean;
  locked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserCreateInput {
  id: string;
  name: string;
  email: string;
  mobile: string;
  dob: string;
  username: string;
  password_hash: string;
}

export interface UserUpdateInput {
  name: string;
  mobile: string;
  dob: string;
  username: string;
}

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  mobile: string;
  dob: string;
  username: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponseData {
  token: string;
  user: UserProfileResponse;
}
