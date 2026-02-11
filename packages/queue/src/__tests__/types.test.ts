import { describe, it, expect } from 'vitest';
import type {
  Job,
  JobType,
  JobStatus,
  GeneratePodcastPayload,
  GeneratePodcastResult,
  GenerateScriptPayload,
  GenerateScriptResult,
  GenerateAudioPayload,
  GenerateAudioResult,
  GenerateVoiceoverPayload,
  GenerateVoiceoverResult,
  GenerateInfographicPayload,
  GenerateInfographicResult,
} from '../types';

/**
 * These are type-level compile-time checks. If any type definition changes
 * incompatibly, these assignments will fail at type-check time (`pnpm typecheck`).
 *
 * We do NOT assert values at runtime — that would be test theater.
 * Instead we verify structural compatibility via satisfies/assignment.
 */
describe('queue types - compile-time contracts', () => {
  it('JobStatus union covers all expected values', () => {
    // If a status is added or removed from the union, this will fail at typecheck
    const allStatuses: Record<JobStatus, true> = {
      pending: true,
      processing: true,
      completed: true,
      failed: true,
    };
    expect(Object.keys(allStatuses)).toHaveLength(4);
  });

  it('JobType union covers all expected values', () => {
    const allTypes: Record<JobType, true> = {
      'generate-podcast': true,
      'generate-script': true,
      'generate-audio': true,
      'generate-voiceover': true,
      'generate-infographic': true,
    };
    expect(Object.keys(allTypes)).toHaveLength(5);
  });

  it('Job generic parameters constrain payload and result', () => {
    // This verifies that Job<P, R> correctly narrows payload/result types.
    // A mismatch (e.g., wrong field name) would fail typecheck.
    const job: Job<GeneratePodcastPayload, GeneratePodcastResult> = {
      id: 'job_1',
      type: 'generate-podcast',
      status: 'completed',
      payload: { podcastId: 'pod_1', userId: 'user_1' },
      result: {
        podcastId: 'pod_1',
        segmentCount: 5,
        audioUrl: 'https://example.com/audio.mp3',
        duration: 1800,
      },
      error: null,
      createdBy: 'user_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
    };

    // Minimal runtime check — the real value is the type constraint above
    expect(job.payload.podcastId).toBe('pod_1');
    expect(job.result?.podcastId).toBe('pod_1');
  });

  it('all payload/result pairs have consistent shapes', () => {
    // Compile-time verification that all payload types have userId
    const payloads: Array<{ userId: string }> = [
      { podcastId: 'p', userId: 'u' } satisfies GeneratePodcastPayload,
      { podcastId: 'p', userId: 'u' } satisfies GenerateScriptPayload,
      { podcastId: 'p', userId: 'u' } satisfies GenerateAudioPayload,
      { voiceoverId: 'v', userId: 'u' } satisfies GenerateVoiceoverPayload,
      { infographicId: 'i', userId: 'u' } satisfies GenerateInfographicPayload,
    ];

    // All payloads should have userId
    expect(payloads.every((p) => typeof p.userId === 'string')).toBe(true);

    // Compile-time verification of result types
    const results = [
      {
        podcastId: 'p',
        segmentCount: 1,
        audioUrl: 'u',
        duration: 0,
      } satisfies GeneratePodcastResult,
      { podcastId: 'p', segmentCount: 1 } satisfies GenerateScriptResult,
      { audioUrl: 'u', duration: 0 } satisfies GenerateAudioResult,
      {
        voiceoverId: 'v',
        audioUrl: 'u',
        duration: 0,
      } satisfies GenerateVoiceoverResult,
      {
        infographicId: 'i',
        imageUrl: 'u',
        versionNumber: 1,
      } satisfies GenerateInfographicResult,
    ];

    expect(results).toHaveLength(5);
  });
});
