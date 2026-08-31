import { RowDataPacket } from 'mysql2';

export type LoginStatus = 'SUCCESS' | 'FAILED' | 'LOCKED';

export interface LoginHistoryRow extends RowDataPacket {
  id: number;
  user_id: string | null;
  identifier: string;
  status: LoginStatus;
  failure_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  attempted_at: string;
}

export interface LoginHistory {
  id: number;
  user_id: string | null;
  identifier: string;
  status: LoginStatus;
  failure_reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  attempted_at: string;
}

export interface LoginHistoryCreateInput {
  user_id?: string | null;
  identifier: string;
  status: LoginStatus;
  failure_reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}
