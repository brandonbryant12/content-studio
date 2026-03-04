import { getCurrentUser } from '@repo/auth/policy';
import { SourceStatus, JobType, type JsonValue } from '@repo/db/schema';
import { Effect } from 'effect';
import type { ProcessUrlPayload } from '@repo/queue';
import { SourceAlreadyProcessing } from '../../errors';
import {
  annotateUseCaseSpan,
  enqueueJob,
  formatUnknownError,
  withTransactionalStateAndEnqueue,
  withUseCaseSpan,
} from '../../shared';
import { SourceRepo } from '../repos';
import { sanitizeMetadata } from '../sanitize-metadata';
import { validateUrl } from '../services/url-validator';

export interface CreateFromUrlInput {
  url: string;
  title?: string;
  metadata?: Record<string, JsonValue>;
}

const ACTIVE_URL_CONSTRAINT = 'source_processing_url_per_user_unique';

export const createFromUrl = (input: CreateFromUrlInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const sourceRepo = yield* SourceRepo;

    // 1. Validate URL format + safety
    const parsed = yield* validateUrl(input.url);
    const url = parsed.href;

    // 2. Derive title from URL if not provided
    const title = input.title || `${parsed.hostname}${parsed.pathname}`;
    let insertedSourceId: string | undefined;
    const markEnqueueFailure = (error: unknown) => {
      if (!insertedSourceId) return Effect.void;
      return sourceRepo.updateStatus(
        insertedSourceId,
        SourceStatus.FAILED,
        `Failed to enqueue URL processing: ${formatUnknownError(error)}`,
      );
    };

    return yield* withTransactionalStateAndEnqueue(
      Effect.gen(function* () {
        const existing = yield* sourceRepo.findBySourceUrl(url, user.id);
        if (existing) {
          yield* annotateUseCaseSpan({
            userId: user.id,
            resourceId: existing.id,
            attributes: {
              'source.id': existing.id,
              'source.url': input.url,
            },
          });
          if (existing.status === SourceStatus.READY) {
            return existing;
          }
          if (existing.status === SourceStatus.PROCESSING) {
            return yield* new SourceAlreadyProcessing({ id: existing.id });
          }
          // If failed, allow creating a new one.
          yield* sourceRepo.delete(existing.id);
        }

        const doc = yield* sourceRepo.insert({
          title,
          contentKey: `sources/pending-${crypto.randomUUID()}.txt`,
          mimeType: 'text/plain',
          wordCount: 0,
          source: 'url',
          sourceUrl: url,
          status: SourceStatus.PROCESSING,
          metadata: sanitizeMetadata(input.metadata),
          createdBy: user.id,
        });
        insertedSourceId = doc.id;
        yield* annotateUseCaseSpan({
          userId: user.id,
          resourceId: doc.id,
          attributes: {
            'source.id': doc.id,
            'source.url': input.url,
          },
        });

        yield* enqueueJob({
          type: JobType.PROCESS_URL,
          payload: {
            sourceId: doc.id,
            url,
            userId: user.id,
          } satisfies ProcessUrlPayload,
          userId: user.id,
        });

        return doc;
      }),
      markEnqueueFailure,
    ).pipe(
      Effect.catchTag('ConstraintViolationError', (error) =>
        Effect.gen(function* () {
          if (error.constraint !== ACTIVE_URL_CONSTRAINT) {
            return yield* Effect.fail(error);
          }

          const existing = yield* sourceRepo.findBySourceUrl(url, user.id);
          if (existing?.status === SourceStatus.READY) {
            return existing;
          }

          if (existing?.status === SourceStatus.PROCESSING) {
            return yield* new SourceAlreadyProcessing({ id: existing.id });
          }

          return yield* Effect.fail(error);
        }),
      ),
    );
  }).pipe(withUseCaseSpan('useCase.createFromUrl'));
