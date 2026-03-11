const MINUTE_MS = 60_000;

/**
 * Timeout budget model for long-running jobs.
 *
 * Source research is allowed to poll for up to the provider's one-hour budget.
 * Podcast generation can wait on those sources for one additional steady poll so
 * a final ready-state write is not treated as a timeout boundary miss.
 *
 * Stale-job recovery is heartbeat-based rather than total-runtime-based:
 * active workers heartbeat every 30s and the reaper only fails jobs after
 * multiple missed heartbeats.
 */
export const SOURCE_RESEARCH_MAX_POLL_DURATION_MS = 60 * MINUTE_MS;
export const SOURCE_RESEARCH_INITIAL_POLL_MS = 30_000;
export const SOURCE_RESEARCH_STEADY_POLL_MS = 60_000;

export const SOURCE_READINESS_POLL_INTERVAL_MS =
  SOURCE_RESEARCH_INITIAL_POLL_MS;
export const SOURCE_READINESS_MAX_POLL_DURATION_MS =
  SOURCE_RESEARCH_MAX_POLL_DURATION_MS + SOURCE_RESEARCH_STEADY_POLL_MS;

export const PROCESSING_JOB_HEARTBEAT_MS = 30_000;
export const STALE_JOB_HEARTBEAT_MISS_BUDGET = 10;
export const STALE_JOB_MAX_AGE_MS =
  PROCESSING_JOB_HEARTBEAT_MS * STALE_JOB_HEARTBEAT_MISS_BUDGET;
