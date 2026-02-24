export interface GoogleApiErrorDetails {
  readonly code?: number;
  readonly status?: string;
  readonly message?: string;
}

export interface GoogleApiErrorInfo {
  readonly statusCode?: number;
  readonly statusText?: string;
  readonly retryAfter?: number;
  readonly body?: string;
  readonly details?: GoogleApiErrorDetails;
  readonly cause?: unknown;
}

export class GoogleApiError extends Error {
  readonly statusCode?: number;
  readonly statusText?: string;
  readonly retryAfter?: number;
  readonly body?: string;
  readonly details?: GoogleApiErrorDetails;
  override cause?: unknown;

  constructor(message: string, info: GoogleApiErrorInfo = {}) {
    super(message);
    this.name = 'GoogleApiError';
    this.statusCode = info.statusCode;
    this.statusText = info.statusText;
    this.retryAfter = info.retryAfter;
    this.body = info.body;
    this.details = info.details;
    this.cause = info.cause;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseGoogleApiErrorBody(
  body: string,
): GoogleApiErrorDetails | null {
  const trimmed = body.trim();
  if (!trimmed || !trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!isRecord(parsed) || !isRecord(parsed.error)) {
      return null;
    }

    const { code, status, message } = parsed.error;
    return {
      code: typeof code === 'number' ? code : undefined,
      status: typeof status === 'string' ? status : undefined,
      message: typeof message === 'string' ? message : undefined,
    };
  } catch {
    return null;
  }
}

export function parseGoogleApiErrorText(
  text: string,
): GoogleApiErrorDetails | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    return parseGoogleApiErrorBody(trimmed);
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return null;
  }

  return parseGoogleApiErrorBody(trimmed.slice(start, end + 1));
}

export function getGoogleApiErrorDetails(
  error: unknown,
): GoogleApiErrorDetails | null {
  if (error instanceof GoogleApiError) {
    return (
      error.details ?? (error.body ? parseGoogleApiErrorBody(error.body) : null)
    );
  }

  if (error instanceof Error) {
    return parseGoogleApiErrorText(error.message);
  }

  if (typeof error === 'string') {
    return parseGoogleApiErrorText(error);
  }

  return null;
}

export function isGoogleRateLimit(
  details: GoogleApiErrorDetails | null,
  statusCode?: number,
): boolean {
  if (statusCode === 429) {
    return true;
  }

  if (!details) {
    return false;
  }

  const status = details.status?.toUpperCase();
  return (
    details.code === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'TOO_MANY_REQUESTS'
  );
}
