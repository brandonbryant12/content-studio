import { SourceStatus } from '@repo/db/schema';
import {
  SOURCE_READINESS_MAX_POLL_DURATION_MS,
  SOURCE_READINESS_POLL_INTERVAL_MS,
} from '@repo/queue';
import { Effect, Schema } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SourceRepo } from '../repos';

export class SourcesNotReadyTimeout extends Schema.TaggedError<SourcesNotReadyTimeout>()(
  'SourcesNotReadyTimeout',
  {
    sourceIds: Schema.Array(Schema.String),
  },
) {
  static readonly httpStatus = 504 as const;
  static readonly httpCode = 'SOURCES_NOT_READY_TIMEOUT' as const;
  static readonly httpMessage = 'Sources did not reach ready state in time';
  static readonly logLevel = 'warn' as const;
  static getData(e: SourcesNotReadyTimeout) {
    return { sourceIds: [...e.sourceIds] };
  }
}

export interface AwaitSourcesReadyInput {
  sourceIds: readonly string[];
}

const getElapsedMs = (startedAtMs: number) => Date.now() - startedAtMs;
const formatElapsedSeconds = (startedAtMs: number) =>
  Math.round(getElapsedMs(startedAtMs) / 1000);

export const awaitSourcesReady = (input: AwaitSourcesReadyInput) =>
  Effect.gen(function* () {
    const { sourceIds } = input;
    if (sourceIds.length === 0) return;

    const sourceRepo = yield* SourceRepo;
    const failNotReady = () =>
      Effect.fail(new SourcesNotReadyTimeout({ sourceIds }));
    const fetchDocs = () =>
      Effect.forEach(sourceIds, (id) => sourceRepo.findById(id));
    const formatPollStatus = (
      docs: ReadonlyArray<{ title: string; status: string }>,
    ) => docs.map((doc) => `${doc.title}=${doc.status}`).join(', ');

    const startedAtMs = Date.now();

    // Check initial status
    let attempt = 1;
    let docs = yield* fetchDocs();

    const primaryId = sourceIds[0];
    if (!primaryId) {
      return yield* Effect.die('Expected at least one source ID');
    }

    const firstDoc = docs[0];
    if (!firstDoc) {
      return yield* Effect.die('Expected at least one source to be loaded');
    }

    yield* annotateUseCaseSpan({
      userId: firstDoc.createdBy,
      resourceId: primaryId,
      attributes: {
        'source.ids': sourceIds.join(','),
      },
    });
    yield* Effect.logInfo(`Poll attempt ${attempt}: ${formatPollStatus(docs)}`);

    // If all ready, return immediately
    if (docs.every((d) => d.status === SourceStatus.READY)) return;

    // If any failed, fail immediately
    const failed = docs.find((d) => d.status === SourceStatus.FAILED);
    if (failed) {
      return yield* failNotReady();
    }

    // Poll until all ready
    while (true) {
      const remainingBudgetMs =
        SOURCE_READINESS_MAX_POLL_DURATION_MS - getElapsedMs(startedAtMs);
      if (remainingBudgetMs <= 0) {
        break;
      }

      yield* Effect.sleep(
        Math.min(SOURCE_READINESS_POLL_INTERVAL_MS, remainingBudgetMs),
      );
      attempt += 1;

      docs = yield* fetchDocs();

      yield* Effect.logInfo(
        `Poll attempt ${attempt}: ${formatPollStatus(docs)} (elapsed: ${formatElapsedSeconds(startedAtMs)}s)`,
      );

      if (docs.every((d) => d.status === SourceStatus.READY)) return;

      const failedSource = docs.find((d) => d.status === SourceStatus.FAILED);
      if (failedSource) {
        return yield* failNotReady();
      }
    }

    return yield* failNotReady();
  }).pipe(withUseCaseSpan('useCase.awaitSourcesReady'));
