import type { JobType } from '@repo/queue';
export { PROCESSING_JOB_HEARTBEAT_MS, STALE_JOB_MAX_AGE_MS } from '@repo/queue';

export const WORKER_DEFAULTS = {
  POLL_INTERVAL_MS: 60_000,
  MAX_CONSECUTIVE_ERRORS: 10,
  BACKOFF_CAP_MS: 60_000,
  WAKE_POLL_TICK_MS: 100,
} as const;

export const QUEUE_DEFAULTS = {
  POLL_INTERVAL_MS: 60_000,
} as const;

/** Maximum number of Postgres connections in a worker process pool */
export const WORKER_DB_POOL_MAX = 12;

/** Maximum number of jobs processed concurrently */
export const MAX_CONCURRENT_JOBS = 20;

/** Per-type concurrency limits (clamped by MAX_CONCURRENT_JOBS) */
export const DEFAULT_PER_TYPE_CONCURRENCY = {
  'generate-podcast': 2,
  'generate-script': 3,
  'generate-audio': 2,
  'generate-voiceover': 2,
  'generate-infographic': 2,
  'process-url': 5,
  'process-research': 3,
} as const satisfies Record<JobType, number>;

/** Run the stale-job reaper every N milliseconds */
export const STALE_CHECK_INTERVAL_MS = 3 * 60 * 1000;
