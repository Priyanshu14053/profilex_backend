import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  const body: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: any[],
  data?: any
): Response => {
  const body: ApiResponse & Record<string, any> = {
    success: false,
    message,
    ...(data !== undefined && { data }),
    ...(errors !== undefined && { errors }),
    ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
  };
  return res.status(statusCode).json(body);
};
