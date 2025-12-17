export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type JobType = 'generate-podcast' | 'generate-script' | 'generate-audio';

export interface Job<TPayload = unknown, TResult = unknown> {
  readonly id: string;
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
  readonly scriptId: string;
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
  readonly scriptId: string;
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
