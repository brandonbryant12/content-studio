import {
  InfographicStatus,
  SourceStatus,
  VersionStatus,
  VoiceoverStatus,
} from '@repo/db/schema';
import {
  InfographicRepo,
  PodcastRepo,
  SourceRepo,
  VoiceoverRepo,
} from '@repo/media';
import type { Job } from '@repo/queue';
import { Effect } from 'effect';

const getStringField = (
  payload: unknown,
  key: 'sourceId' | 'podcastId' | 'voiceoverId' | 'infographicId',
): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
};

export const syncFailedEntityStateForJob = (job: Job, errorMessage: string) =>
  Effect.gen(function* () {
    const sourceId = getStringField(job.payload, 'sourceId');
    if (sourceId) {
      const repo = yield* SourceRepo;
      yield* repo.updateStatus(sourceId, SourceStatus.FAILED, errorMessage);
      return;
    }

    const podcastId = getStringField(job.payload, 'podcastId');
    if (podcastId) {
      const repo = yield* PodcastRepo;
      yield* repo.updateStatus(podcastId, VersionStatus.FAILED, errorMessage);
      return;
    }

    const voiceoverId = getStringField(job.payload, 'voiceoverId');
    if (voiceoverId) {
      const repo = yield* VoiceoverRepo;
      yield* repo.updateStatus(
        voiceoverId,
        VoiceoverStatus.FAILED,
        errorMessage,
      );
      return;
    }

    const infographicId = getStringField(job.payload, 'infographicId');
    if (infographicId) {
      const repo = yield* InfographicRepo;
      yield* repo.update(infographicId, {
        status: InfographicStatus.FAILED,
        errorMessage,
      });
    }
  });
