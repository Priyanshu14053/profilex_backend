export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: any[];
  public readonly data?: any;

  constructor(message: string, statusCode: number = 500, errors?: any[], data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.data = data;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Invalid credentials', data?: any) {
    super(message, 401, undefined, data);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests', data?: any) {
    super(message, 429, undefined, data);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, errors?: any[]) {
    super(message, 400, errors);
  }
}
