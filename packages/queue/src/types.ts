import type {
  JobId,
  JobStatus as DbJobStatus,
  JobType as DbJobType,
} from '@repo/db/schema';

export type JobStatus = DbJobStatus;

export type JobType = DbJobType[keyof DbJobType];

export interface Job<TPayload = unknown, TResult = unknown> {
  readonly id: JobId;
  readonly type: JobType;
  readonly status: JobStatus;
  readonly payload: TPayload;
  readonly result: TResult | null;
  readonly error: string | null;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
}

export interface GeneratePodcastPayload {
  readonly podcastId: string;
  readonly userId: string;
  readonly promptInstructions?: string;
}

export interface GeneratePodcastResult {
  readonly podcastId: string;
  readonly segmentCount: number;
  readonly audioUrl: string;
  readonly duration: number;
}

export interface GenerateScriptPayload {
  readonly podcastId: string;
  readonly userId: string;
  readonly promptInstructions?: string;
}

export interface GenerateScriptResult {
  readonly podcastId: string;
  readonly segmentCount: number;
}

export interface GenerateAudioPayload {
  readonly podcastId: string;
  readonly userId: string;
}

export interface GenerateAudioResult {
  readonly audioUrl: string;
  readonly duration: number;
}

export interface GenerateVoiceoverPayload {
  readonly voiceoverId: string;
  readonly userId: string;
}

export interface GenerateVoiceoverResult {
  readonly voiceoverId: string;
  readonly audioUrl: string;
  readonly duration: number;
}

export interface GenerateInfographicPayload {
  readonly infographicId: string;
  readonly userId: string;
}

export interface GenerateInfographicResult {
  readonly infographicId: string;
  readonly imageUrl: string;
  readonly versionNumber: number;
}

export interface ProcessUrlPayload {
  readonly documentId: string;
  readonly url: string;
  readonly userId: string;
}

export interface ProcessUrlResult {
  readonly documentId: string;
  readonly wordCount: number;
}

export interface ProcessResearchPayload {
  readonly documentId: string;
  readonly query: string;
  readonly userId: string;
}

export interface ProcessResearchResult {
  readonly documentId: string;
  readonly wordCount: number;
}
