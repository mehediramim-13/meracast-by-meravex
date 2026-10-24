export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "RATE_LIMITED"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: ApiErrorCode;
      retryable?: boolean;
      retryAfter?: number;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "UNKNOWN";
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, cause?: unknown) {
    super(message, { status: 502, code: "INVALID_RESPONSE", retryable: true, cause });
    this.name = "ValidationError";
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new ApiError("The weather service took too long to respond.", {
      status: 504,
      code: "UPSTREAM_TIMEOUT",
      retryable: true,
      cause: error,
    });
  }
  return new ApiError("An unexpected weather service error occurred.", {
    status: 500,
    code: "UNKNOWN",
    retryable: true,
    cause: error,
  });
}
