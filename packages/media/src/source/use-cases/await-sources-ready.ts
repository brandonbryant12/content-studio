import { SourceStatus } from '@repo/db/schema';
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

/** Max total polling time: 65 minutes (slightly beyond research's 60min max) */
const MAX_POLL_DURATION_MS = 65 * 60 * 1000;

/** Poll interval: 30 seconds */
const POLL_INTERVAL_MS = 30_000;

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
    let elapsed = 0;
    while (elapsed < MAX_POLL_DURATION_MS) {
      yield* Effect.sleep(POLL_INTERVAL_MS);
      elapsed += POLL_INTERVAL_MS;
      attempt += 1;

      docs = yield* fetchDocs();

      yield* Effect.logInfo(
        `Poll attempt ${attempt}: ${formatPollStatus(docs)} (elapsed: ${Math.round(elapsed / 1000)}s)`,
      );

      if (docs.every((d) => d.status === SourceStatus.READY)) return;

      const failedDoc = docs.find((d) => d.status === SourceStatus.FAILED);
      if (failedDoc) {
        return yield* failNotReady();
      }
    }

    return yield* failNotReady();
  }).pipe(withUseCaseSpan('useCase.awaitSourcesReady'));
