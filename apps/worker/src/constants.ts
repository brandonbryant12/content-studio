import type { JobType } from '@repo/queue';

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

/** Active jobs heartbeat this often while they remain in `processing`. */
export const PROCESSING_JOB_HEARTBEAT_MS = 30 * 1000; // 30 seconds

/**
 * Jobs whose heartbeat goes quiet longer than this are considered orphaned.
 * With heartbeats active, this can stay short without interrupting healthy
 * long-running research polls.
 */
export const STALE_JOB_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/** Run the stale-job reaper every N milliseconds */
export const STALE_CHECK_INTERVAL_MS = 3 * 60 * 1000;
