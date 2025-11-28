import { Schema } from 'effect';

export class QueueError extends Schema.TaggedError<QueueError>()('QueueError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

export class JobNotFoundError extends Schema.TaggedError<JobNotFoundError>()(
  'JobNotFoundError',
  {
    jobId: Schema.String,
  },
) {}

export class JobProcessingError extends Schema.TaggedError<JobProcessingError>()(
  'JobProcessingError',
  {
    jobId: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}
