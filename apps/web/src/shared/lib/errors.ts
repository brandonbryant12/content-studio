import { formatFileSize } from './formatters';

// ============================================================================
// Types
// ============================================================================

/** Structured API error with code and optional data */
interface DefinedAPIError {
  code: string;
  message: string;
  data?: unknown;
}

/**
 * Type guard to check if error is a structured API error.
 * Matches errors returned by oRPC with code/message/data shape.
 */
const isDefinedAPIError = (error: unknown): error is DefinedAPIError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as DefinedAPIError).code === 'string' &&
    typeof (error as DefinedAPIError).message === 'string'
  );
};

// ============================================================================
// Error Message Formatter
// ============================================================================

/**
 * Extract a user-friendly error message from an API error.
 *
 * Checks for structured errors with code/message/data and formats them
 * appropriately. Falls back to `error.message` or the provided fallback string.
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!isDefinedAPIError(error)) {
    return (error as Error)?.message ?? fallback;
  }

  switch (error.code) {
    case 'DOCUMENT_TOO_LARGE': {
      const data = error.data as {
        fileName: string;
        fileSize: number;
        maxSize: number;
      };
      return `${data.fileName} (${formatFileSize(data.fileSize)}) exceeds ${formatFileSize(data.maxSize)} limit`;
    }

    case 'UNSUPPORTED_FORMAT': {
      const data = error.data as {
        fileName: string;
        mimeType: string;
        supportedFormats: string[];
      };
      return `${data.mimeType} not supported. Use: ${data.supportedFormats.join(', ')}`;
    }

    case 'RATE_LIMITED': {
      const data = error.data as { retryAfter?: number } | undefined;
      return data?.retryAfter
        ? `Too many requests. Try again in ${Math.ceil(data.retryAfter / 1000)} seconds.`
        : 'Too many requests. Please wait a moment.';
    }

    case 'DOCUMENT_QUOTA_EXCEEDED': {
      const data = error.data as { count: number; limit: number };
      return `You've reached your document limit (${data.count}/${data.limit}). Upgrade to add more.`;
    }

    case 'GENERATION_IN_PROGRESS': {
      return 'This podcast is already being generated. Please wait.';
    }

    case 'DOCUMENT_NOT_FOUND': {
      return 'Document not found. It may have been deleted.';
    }

    case 'PODCAST_NOT_FOUND': {
      return 'Podcast not found. It may have been deleted.';
    }

    case 'SCRIPT_NOT_FOUND': {
      return 'Script not found. Try regenerating the podcast.';
    }

    case 'DOCUMENT_PARSE_ERROR': {
      const data = error.data as { fileName: string };
      return `Failed to parse ${data.fileName}. The file may be corrupted.`;
    }

    case 'VALIDATION_ERROR': {
      const data = error.data as { field?: string } | undefined;
      return data?.field
        ? `Invalid value for ${data.field}`
        : error.message;
    }

    case 'SERVICE_UNAVAILABLE': {
      return 'AI service is temporarily unavailable. Please try again later.';
    }

    case 'JOB_NOT_FOUND': {
      return 'Job not found. It may have expired.';
    }

    default:
      return error.message;
  }
};
