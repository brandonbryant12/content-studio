import { Context } from 'effect';
import type {
  QueueError,
  JobNotFoundError,
  JobProcessingError,
} from './errors';
import type { Job, JobType, JobStatus } from './types';
import type { Effect } from 'effect';

export interface QueueService {
  readonly enqueue: (
    type: JobType,
    payload: unknown,
    userId: string,
  ) => Effect.Effect<Job, QueueError>;

  readonly getJob: (
    jobId: string,
  ) => Effect.Effect<Job, QueueError | JobNotFoundError>;

  readonly getJobsByUser: (
    userId: string,
    type?: JobType,
  ) => Effect.Effect<Job[], QueueError>;

  readonly updateJobStatus: (
    jobId: string,
    status: JobStatus,
    result?: unknown,
    error?: string,
  ) => Effect.Effect<Job, QueueError | JobNotFoundError>;

  readonly processNextJob: (
    type: JobType,
    handler: (job: Job) => Effect.Effect<unknown, JobProcessingError>,
  ) => Effect.Effect<
    Job | null,
    QueueError | JobProcessingError | JobNotFoundError
  >;

  readonly processJobById: (
    jobId: string,
    handler: (job: Job) => Effect.Effect<unknown, JobProcessingError>,
  ) => Effect.Effect<Job, QueueError | JobProcessingError | JobNotFoundError>;

  readonly findPendingJobForPodcast: (
    podcastId: string,
  ) => Effect.Effect<Job | null, QueueError>;

  readonly deleteJob: (
    jobId: string,
  ) => Effect.Effect<void, QueueError | JobNotFoundError>;
}

export class Queue extends Context.Tag('@repo/queue/Queue')<
  Queue,
  QueueService
>() {}
