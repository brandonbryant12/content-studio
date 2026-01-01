import {
  generatePodcastId,
  generateScriptVersionId,
  type PodcastId,
  type ScriptVersionId,
  type Podcast,
  type PodcastScript,
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
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Options for creating a test podcast script (version).
 */
export interface CreateTestPodcastScriptOptions {
  id?: string;
  podcastId?: PodcastId;
  version?: number;
  isActive?: boolean;
  status?: VersionStatus;
  errorMessage?: string | null;
  segments?: ScriptSegment[] | null;
  summary?: string | null;
  generationPrompt?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let podcastCounter = 0;
let scriptCounter = 0;

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
 * Note: Status is now tracked at the version (PodcastScript) level.
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
    sourceDocumentIds: (options.sourceDocumentIds ?? []) as Podcast['sourceDocumentIds'],
    generationContext: options.generationContext ?? null,
    createdBy: options.createdBy ?? 'test-user-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

/**
 * Create a test podcast script (version) with default values.
 */
export const createTestPodcastScript = (
  options: CreateTestPodcastScriptOptions = {},
): PodcastScript => {
  scriptCounter++;
  const now = new Date();

  return {
    id: (options.id ?? generateScriptVersionId()) as ScriptVersionId,
    podcastId: options.podcastId ?? generatePodcastId(),
    version: options.version ?? 1,
    isActive: options.isActive ?? true,
    status: options.status ?? 'drafting',
    errorMessage: options.errorMessage ?? null,
    segments: options.segments ?? DEFAULT_TEST_SEGMENTS,
    summary: options.summary ?? 'A test podcast about interesting topics.',
    generationPrompt: options.generationPrompt ?? null,
    audioUrl: options.audioUrl ?? null,
    duration: options.duration ?? null,
    createdBy: options.createdBy ?? 'test-user-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

/**
 * Create a test podcast script with ready status.
 */
export const createReadyScript = (
  options: Omit<CreateTestPodcastScriptOptions, 'status' | 'audioUrl' | 'duration'> = {},
): PodcastScript => {
  const podcastId = options.podcastId ?? generatePodcastId();
  return createTestPodcastScript({
    ...options,
    podcastId,
    status: 'ready',
    audioUrl: `https://storage.example.com/podcasts/${podcastId}/audio.wav`,
    duration: 300, // 5 minutes
  });
};

/**
 * Create a test podcast script with script ready (no audio yet).
 */
export const createScriptReadyScript = (
  options: Omit<CreateTestPodcastScriptOptions, 'status'> = {},
): PodcastScript => {
  return createTestPodcastScript({
    ...options,
    status: 'script_ready',
  });
};

/**
 * Create a test podcast with an active ready version.
 * Returns both the podcast and its version.
 */
export const createReadyPodcastWithVersion = (
  podcastOptions: CreateTestPodcastOptions = {},
): { podcast: Podcast; version: PodcastScript } => {
  const podcast = createTestPodcast(podcastOptions);
  const version = createReadyScript({
    podcastId: podcast.id,
    createdBy: podcast.createdBy,
  });
  return { podcast, version };
};

/**
 * Create a test podcast with an active script-ready version.
 * Returns both the podcast and its version.
 */
export const createScriptReadyPodcastWithVersion = (
  podcastOptions: CreateTestPodcastOptions = {},
): { podcast: Podcast; version: PodcastScript } => {
  const podcast = createTestPodcast(podcastOptions);
  const version = createScriptReadyScript({
    podcastId: podcast.id,
    createdBy: podcast.createdBy,
  });
  return { podcast, version };
};

/**
 * Reset the counters (call in beforeEach for consistent test data).
 */
export const resetPodcastCounters = () => {
  podcastCounter = 0;
  scriptCounter = 0;
};

// Keep backwards compatible alias
export const createAudioReadyScript = createReadyScript;
