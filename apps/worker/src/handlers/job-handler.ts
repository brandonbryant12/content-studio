import { JobProcessingError, formatError, type Job } from '@repo/queue';
import { Effect } from 'effect';

type JobSpanAttributes = Record<string, string | number | boolean | undefined>;

const normalizeSpanAttributes = (
  attributes: JobSpanAttributes,
): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean>;

export interface DefineJobHandlerOptions<TPayload, A, E, R> {
  readonly span: string;
  readonly errorMessage: string;
  readonly attributes?: (job: Job<TPayload>) => JobSpanAttributes;
  readonly run: (job: Job<TPayload>) => Effect.Effect<A, E, R>;
}

export const defineJobHandler =
  <TPayload>() =>
  <A, E, R>(options: DefineJobHandlerOptions<TPayload, A, E, R>) =>
  (job: Job<TPayload>) =>
    options.run(job).pipe(
      Effect.catchAll((error) =>
        Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `${options.errorMessage}: ${formatError(error)}`,
            cause: error,
          }),
        ),
      ),
      Effect.withSpan(options.span, {
        attributes: normalizeSpanAttributes({
          'job.id': job.id,
          'job.type': job.type,
          'user.id': job.createdBy,
          ...options.attributes?.(job),
        }),
      }),
    );
