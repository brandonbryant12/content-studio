import {
  generatePodcastId,
  type PodcastId,
  type Podcast,
  type PodcastFormat,
  type VersionStatus,
  type ScriptSegment,
  type GenerationContext,
} from '@repo/db/schema';

/**
 * Options for creating a test podcast.
 */
export interface CreateTestPodcastOptions {
  id?: PodcastId;
  title?: string;
  description?: string | null;
  format?: PodcastFormat;
  hostVoice?: string | null;
  hostVoiceName?: string | null;
  coHostVoice?: string | null;
  coHostVoiceName?: string | null;
  promptInstructions?: string | null;
  targetDurationMinutes?: number | null;
  tags?: string[];
  sourceDocumentIds?: string[];
  generationContext?: GenerationContext | null;
  // Script fields (flattened)
  status?: VersionStatus;
  segments?: ScriptSegment[] | null;
  summary?: string | null;
  generationPrompt?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  errorMessage?: string | null;
  ownerHasApproved?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let podcastCounter = 0;

/**
 * Default segments for a test podcast script.
 */
export const DEFAULT_TEST_SEGMENTS: ScriptSegment[] = [
  { speaker: 'host', line: 'Welcome to the show!', index: 0 },
  { speaker: 'cohost', line: 'Thanks for having me.', index: 1 },
  { speaker: 'host', line: "Let us discuss today's topic.", index: 2 },
  { speaker: 'cohost', line: 'Great idea!', index: 3 },
];

/**
 * Create a test podcast with default values.
 * All script fields are now directly on the podcast (flattened schema).
 */
export const createTestPodcast = (
  options: CreateTestPodcastOptions = {},
): Podcast => {
  podcastCounter++;
  const now = new Date();

  return {
    id: options.id ?? generatePodcastId(),
    title: options.title ?? `Test Podcast ${podcastCounter}`,
    description:
      options.description ?? `Description for test podcast ${podcastCounter}`,
    format: options.format ?? 'conversation',
    hostVoice: options.hostVoice ?? 'Charon',
    hostVoiceName: options.hostVoiceName ?? 'Charon',
    coHostVoice: options.coHostVoice ?? 'Kore',
    coHostVoiceName: options.coHostVoiceName ?? 'Kore',
    promptInstructions: options.promptInstructions ?? null,
    targetDurationMinutes: options.targetDurationMinutes ?? 5,
    tags: options.tags ?? [],
    sourceDocumentIds: (options.sourceDocumentIds ??
      []) as Podcast['sourceDocumentIds'],
    generationContext: options.generationContext ?? null,
    // Script fields (flattened)
    status: options.status ?? 'drafting',
    segments: options.segments ?? null,
    summary: options.summary ?? null,
    generationPrompt: options.generationPrompt ?? null,
    audioUrl: options.audioUrl ?? null,
    duration: options.duration ?? null,
    errorMessage: options.errorMessage ?? null,
    ownerHasApproved: options.ownerHasApproved ?? false,
    createdBy: options.createdBy ?? 'test-user-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

/**
 * Create a test podcast with ready status and audio.
 */
export const createReadyPodcast = (
  options: Omit<CreateTestPodcastOptions, 'status' | 'audioUrl' | 'duration'> = {},
): Podcast => {
  const id = options.id ?? generatePodcastId();
  return createTestPodcast({
    ...options,
    id,
    status: 'ready',
    segments: options.segments ?? DEFAULT_TEST_SEGMENTS,
    summary: options.summary ?? 'A test podcast about interesting topics.',
    audioUrl: `https://storage.example.com/podcasts/${id}/audio.wav`,
    duration: 300, // 5 minutes
  });
};

/**
 * Create a test podcast with script ready status (no audio yet).
 */
export const createScriptReadyPodcast = (
  options: Omit<CreateTestPodcastOptions, 'status'> = {},
): Podcast => {
  return createTestPodcast({
    ...options,
    status: 'script_ready',
    segments: options.segments ?? DEFAULT_TEST_SEGMENTS,
    summary: options.summary ?? 'A test podcast about interesting topics.',
  });
};

/**
 * Reset the counters (call in beforeEach for consistent test data).
 */
export const resetPodcastCounters = () => {
  podcastCounter = 0;
};
