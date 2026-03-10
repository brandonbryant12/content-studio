import { formatFileSize } from './formatters';

interface DefinedAPIError {
  code: string;
  message: string;
  data?: unknown;
}

const isDefinedAPIError = (error: unknown): error is DefinedAPIError => {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as Record<string, unknown>;
  return typeof e.code === 'string' && typeof e.message === 'string';
};

const getErrorData = <T>(error: DefinedAPIError): T => error.data as T;

const STATIC_ERROR_MESSAGES = {
  GENERATION_IN_PROGRESS:
    'This podcast is already being generated. Please wait.',
  SOURCE_NOT_FOUND: 'Source not found. It may have been deleted.',
  PODCAST_NOT_FOUND: 'Podcast not found. It may have been deleted.',
  SCRIPT_NOT_FOUND: 'Script not found. Try regenerating the podcast.',
  SERVICE_UNAVAILABLE:
    'AI service is temporarily unavailable. Please try again later.',
  DEEP_RESEARCH_DISABLED: 'Deep research is currently disabled.',
  JOB_NOT_FOUND: 'Job not found. It may have expired.',
} satisfies Record<string, string>;

const hasStaticErrorMessage = (
  code: string,
): code is keyof typeof STATIC_ERROR_MESSAGES => code in STATIC_ERROR_MESSAGES;

const getUnknownErrorMessage = (error: unknown, fallback: string): string => {
  if (
    (typeof error === 'object' || typeof error === 'function') &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!isDefinedAPIError(error)) {
    return getUnknownErrorMessage(error, fallback);
  }

  switch (error.code) {
    case 'SOURCE_TOO_LARGE': {
      const data = getErrorData<{
        fileName: string;
        fileSize: number;
        maxSize: number;
      }>(error);
      return `${data.fileName} (${formatFileSize(data.fileSize)}) exceeds ${formatFileSize(data.maxSize)} limit`;
    }

    case 'UNSUPPORTED_FORMAT': {
      const data = getErrorData<{
        mimeType: string;
        supportedFormats: string[];
      }>(error);
      return `${data.mimeType} not supported. Use: ${data.supportedFormats.join(', ')}`;
    }

    case 'RATE_LIMITED': {
      const data = getErrorData<{ retryAfter?: number } | undefined>(error);
      return data?.retryAfter
        ? `Too many requests. Try again in ${Math.ceil(data.retryAfter / 1000)} seconds.`
        : 'Too many requests. Please wait a moment.';
    }

    case 'SOURCE_QUOTA_EXCEEDED': {
      const data = getErrorData<{ count: number; limit: number }>(error);
      return `You've reached your source limit (${data.count}/${data.limit}). Upgrade to add more.`;
    }

    case 'SOURCE_PARSE_ERROR': {
      const data = getErrorData<{ fileName: string }>(error);
      return `Failed to parse ${data.fileName}. The file may be corrupted.`;
    }

    case 'VALIDATION_ERROR': {
      const data = getErrorData<{ field?: string } | undefined>(error);
      return data?.field ? `Invalid value for ${data.field}` : error.message;
    }

    default:
      return hasStaticErrorMessage(error.code)
        ? STATIC_ERROR_MESSAGES[error.code]
        : error.message;
  }
};

const SAFE_GENERATION_ERROR_PATTERNS = [
  /^Generation failed(?:\.[\s\S]*)?$/i,
  /^Processing failed(?:\.[\s\S]*)?$/i,
  /^Too many requests\.[\s\S]*$/i,
  /^AI service is temporarily unavailable\.[\s\S]*$/i,
  /^Deep research is currently disabled\.[\s\S]*$/i,
  /^Source not found\.[\s\S]*$/i,
  /^Podcast not found\.[\s\S]*$/i,
  /^Script not found\.[\s\S]*$/i,
  /^Job not found\.[\s\S]*$/i,
  /^Failed to parse [\s\S]+\.$/i,
  /^Invalid value for [\s\S]+$/i,
  /^This podcast is already being generated\.[\s\S]*$/i,
  /^Your infographic could not be generated\.[\s\S]*$/i,
] as const;

export const getGenerationFailureMessage = (
  errorMessage: string | null | undefined,
  fallback = 'Generation failed. Please retry.',
): string | null => {
  if (typeof errorMessage !== 'string') {
    return null;
  }

  const normalizedMessage = errorMessage.trim();
  if (normalizedMessage.length === 0) {
    return null;
  }

  return SAFE_GENERATION_ERROR_PATTERNS.some((pattern) =>
    pattern.test(normalizedMessage),
  )
    ? normalizedMessage
    : fallback;
};
