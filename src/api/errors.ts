import type { ApiErrorDetail } from './types';

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown> | Array<unknown>;
  public readonly requestId?: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    errorDetail?: ApiErrorDetail,
    statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = errorDetail?.code || 'UNKNOWN_ERROR';
    this.details = errorDetail?.details;
    this.requestId = errorDetail?.request_id;
    this.statusCode = statusCode;
  }

  get isUnauthorized(): boolean {
    return this.code === 'UNAUTHORIZED' || this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.code === 'FORBIDDEN' || this.statusCode === 403;
  }

  get isNotFound(): boolean {
    return this.code === 'NOT_FOUND' || this.statusCode === 404;
  }

  get isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR' || this.statusCode === 422;
  }
}
