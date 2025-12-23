import { randomUUID } from 'crypto';
import type {
  Podcast,
  PodcastScript,
  PodcastFormat,
  PodcastStatus,
  PublishStatus,
  ScriptSegment,
  GenerationContext,
} from '@repo/db/schema';

/**
 * Options for creating a test podcast.
 */
export interface CreateTestPodcastOptions {
  id?: string;
  title?: string;
  description?: string | null;
  format?: PodcastFormat;
  status?: PodcastStatus;
  hostVoice?: string | null;
  hostVoiceName?: string | null;
  coHostVoice?: string | null;
  coHostVoiceName?: string | null;
  promptInstructions?: string | null;
  targetDurationMinutes?: number | null;
  audioUrl?: string | null;
  duration?: number | null;
  errorMessage?: string | null;
  tags?: string[];
  sourceDocumentIds?: string[];
  generationContext?: GenerationContext | null;
  publishStatus?: PublishStatus;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Options for creating a test podcast script.
 */
export interface CreateTestPodcastScriptOptions {
  id?: string;
  podcastId?: string;
  version?: number;
  isActive?: boolean;
  segments?: ScriptSegment[];
  summary?: string | null;
  generationPrompt?: string | null;
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
 */
export const createTestPodcast = (
  options: CreateTestPodcastOptions = {},
): Podcast => {
  podcastCounter++;
  const now = new Date();

  return {
    id: options.id ?? randomUUID(),
    title: options.title ?? `Test Podcast ${podcastCounter}`,
    description:
      options.description ?? `Description for test podcast ${podcastCounter}`,
    format: options.format ?? 'conversation',
    status: options.status ?? 'draft',
    hostVoice: options.hostVoice ?? 'Charon',
    hostVoiceName: options.hostVoiceName ?? 'Charon',
    coHostVoice: options.coHostVoice ?? 'Kore',
    coHostVoiceName: options.coHostVoiceName ?? 'Kore',
    promptInstructions: options.promptInstructions ?? null,
    targetDurationMinutes: options.targetDurationMinutes ?? 5,
    audioUrl: options.audioUrl ?? null,
    duration: options.duration ?? null,
    errorMessage: options.errorMessage ?? null,
    tags: options.tags ?? [],
    sourceDocumentIds: options.sourceDocumentIds ?? [],
    generationContext: options.generationContext ?? null,
    publishStatus: options.publishStatus ?? 'draft',
    publishedAt: options.publishedAt ?? null,
    publishedBy: options.publishedBy ?? null,
    createdBy: options.createdBy ?? randomUUID(),
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

/**
 * Create a test podcast script with default values.
 */
export const createTestPodcastScript = (
  options: CreateTestPodcastScriptOptions = {},
): PodcastScript => {
  scriptCounter++;
  const now = new Date();

  return {
    id: options.id ?? randomUUID(),
    podcastId: options.podcastId ?? randomUUID(),
    version: options.version ?? 1,
    isActive: options.isActive ?? true,
    segments: options.segments ?? DEFAULT_TEST_SEGMENTS,
    summary: options.summary ?? 'A test podcast about interesting topics.',
    generationPrompt: options.generationPrompt ?? null,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

/**
 * Create a test podcast that is ready with audio.
 */
export const createReadyPodcast = (
  options: Omit<
    CreateTestPodcastOptions,
    'status' | 'audioUrl' | 'duration'
  > = {},
): Podcast => {
  return createTestPodcast({
    ...options,
    status: 'ready',
    audioUrl: `https://storage.example.com/podcasts/${options.id ?? randomUUID()}/audio.wav`,
    duration: 300, // 5 minutes
  });
};

/**
 * Create a test podcast with script ready (no audio yet).
 */
export const createScriptReadyPodcast = (
  options: Omit<CreateTestPodcastOptions, 'status'> = {},
): Podcast => {
  return createTestPodcast({
    ...options,
    status: 'script_ready',
  });
};

/**
 * Reset the counters (call in beforeEach for consistent test data).
 */
export const resetPodcastCounters = () => {
  podcastCounter = 0;
  scriptCounter = 0;
};
