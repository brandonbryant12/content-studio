/**
 * HTTP Error Protocol Interface
 *
 * Every tagged error class should implement this protocol via static properties.
 * This allows the generic error handler to automatically map errors to HTTP responses
 * without needing a central error handler factory.
 *
 * @example
 * ```typescript
 * export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
 *   'DocumentNotFound',
 *   { id: Schema.String },
 * ) {
 *   static readonly httpStatus = 404;
 *   static readonly httpCode = 'DOCUMENT_NOT_FOUND';
 *   static readonly httpMessage = (e: DocumentNotFound) => `Document ${e.id} not found`;
 *   static readonly logLevel = 'silent';
 * }
 * ```
 */
export interface HttpErrorProtocol<E = unknown> {
  /** HTTP status code (e.g., 404, 500) */
  readonly httpStatus: number;

  /** oRPC error code (e.g., 'DOCUMENT_NOT_FOUND', 'INTERNAL_ERROR') */
  readonly httpCode: string;

  /**
   * Message to return in HTTP response.
   * Can be a static string or a function that extracts message from error instance.
   */
  readonly httpMessage: string | ((error: E) => string);

  /**
   * Log level for this error:
   * - 'silent': No logging (expected errors like NotFound)
   * - 'warn': Warning level (unusual but not critical)
   * - 'error': Error level (unexpected errors)
   * - 'error-with-stack': Error with full stack trace (internal errors)
   */
  readonly logLevel: 'silent' | 'warn' | 'error' | 'error-with-stack';

  /**
   * Optional: Extract additional data for the error response body.
   * Useful for returning structured error details to the client.
   */
  getData?: (error: E) => Record<string, unknown>;
}

/**
 * Type guard to check if an error class implements HttpErrorProtocol.
 */
export const hasHttpProtocol = (
  ErrorClass: unknown,
): ErrorClass is HttpErrorProtocol => {
  if (typeof ErrorClass !== 'function' && typeof ErrorClass !== 'object') {
    return false;
  }
  const proto = ErrorClass as Record<string, unknown>;
  return (
    typeof proto.httpStatus === 'number' &&
    typeof proto.httpCode === 'string' &&
    (typeof proto.httpMessage === 'string' ||
      typeof proto.httpMessage === 'function') &&
    typeof proto.logLevel === 'string'
  );
};

/**
 * Log levels in order of severity.
 * Used by the generic handler to determine logging behavior.
 */
export type LogLevel = HttpErrorProtocol['logLevel'];
