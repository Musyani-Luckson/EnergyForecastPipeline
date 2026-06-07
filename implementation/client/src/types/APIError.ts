type ErrorType =
  | "AUTH_ERROR"
  | "VALIDATION_ERROR"
  | "PERMISSION_ERROR"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "NETWORK_ERROR";

export interface ApiErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    code?: string;
    details?: Record<string, unknown> | null;
  };
  meta?: {
    timestamp: string;
    path: string;
    method: string;
  };
}
