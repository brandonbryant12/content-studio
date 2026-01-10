/**
 * Server-Sent Events (SSE) event types for real-time updates
 */

export type EntityType = 'podcast' | 'document' | 'voiceover' | 'infographic';
export type ChangeType = 'insert' | 'update' | 'delete';

export interface EntityChangeEvent {
  type: 'entity_change';
  entityType: EntityType;
  changeType: ChangeType;
  entityId: string;
  userId: string;
  timestamp: string;
}

export interface JobCompletionEvent {
  type: 'job_completion';
  jobId: string;
  jobType: 'generate-podcast' | 'generate-script' | 'generate-audio';
  status: 'completed' | 'failed';
  podcastId: string;
  error?: string;
}

export interface VoiceoverJobCompletionEvent {
  type: 'voiceover_job_completion';
  jobId: string;
  jobType: 'generate-voiceover';
  status: 'completed' | 'failed';
  voiceoverId: string;
  error?: string;
}

export interface InfographicJobCompletionEvent {
  type: 'infographic_job_completion';
  jobId: string;
  jobType: 'generate-infographic';
  status: 'completed' | 'failed';
  infographicId: string;
  error?: string;
}

export interface ConnectionEvent {
  type: 'connected';
  userId: string;
}

export type SSEEvent =
  | EntityChangeEvent
  | JobCompletionEvent
  | VoiceoverJobCompletionEvent
  | InfographicJobCompletionEvent
  | ConnectionEvent;
