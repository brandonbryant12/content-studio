/**
 * Server constants - extracted magic numbers for maintainability.
 */

/** Default HTTP server port */
export const DEFAULT_SERVER_PORT = 3035;

/** Worker configuration defaults */
export const WORKER_DEFAULTS = {
  /** Default polling interval in milliseconds */
  POLL_INTERVAL_MS: 5000,
  /** Maximum consecutive errors before worker shutdown */
  MAX_CONSECUTIVE_ERRORS: 10,
  /** Maximum backoff time in milliseconds (1 minute) */
  BACKOFF_CAP_MS: 60_000,
} as const;

/** Job queue configuration */
export const QUEUE_DEFAULTS = {
  /** Polling interval for job queue in milliseconds */
  POLL_INTERVAL_MS: 3000,
} as const;
