/**
 * Server-Sent Events (SSE) event types for real-time updates
 */

import { oc, eventIterator } from '@orpc/contract';
import { Schema } from 'effect';
import { std } from './shared';

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

export interface ActivityLoggedEvent {
  type: 'activity_logged';
  activityId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  timestamp: string;
}

export interface DocumentJobCompletionEvent {
  type: 'document_job_completion';
  jobId: string;
  jobType: 'process-url' | 'process-research';
  status: 'completed' | 'failed';
  documentId: string;
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
  | DocumentJobCompletionEvent
  | ActivityLoggedEvent
  | ConnectionEvent;

const EntityChangeEventSchema = Schema.Struct({
  type: Schema.Literal('entity_change'),
  entityType: Schema.Literal('podcast', 'document', 'voiceover', 'infographic'),
  changeType: Schema.Literal('insert', 'update', 'delete'),
  entityId: Schema.String,
  userId: Schema.String,
  timestamp: Schema.String,
});

const JobCompletionEventSchema = Schema.Struct({
  type: Schema.Literal('job_completion'),
  jobId: Schema.String,
  jobType: Schema.Literal(
    'generate-podcast',
    'generate-script',
    'generate-audio',
  ),
  status: Schema.Literal('completed', 'failed'),
  podcastId: Schema.String,
  error: Schema.optional(Schema.String),
});

const VoiceoverJobCompletionEventSchema = Schema.Struct({
  type: Schema.Literal('voiceover_job_completion'),
  jobId: Schema.String,
  jobType: Schema.Literal('generate-voiceover'),
  status: Schema.Literal('completed', 'failed'),
  voiceoverId: Schema.String,
  error: Schema.optional(Schema.String),
});

const InfographicJobCompletionEventSchema = Schema.Struct({
  type: Schema.Literal('infographic_job_completion'),
  jobId: Schema.String,
  jobType: Schema.Literal('generate-infographic'),
  status: Schema.Literal('completed', 'failed'),
  infographicId: Schema.String,
  error: Schema.optional(Schema.String),
});

const ActivityLoggedEventSchema = Schema.Struct({
  type: Schema.Literal('activity_logged'),
  activityId: Schema.String,
  userId: Schema.String,
  action: Schema.String,
  entityType: Schema.String,
  entityId: Schema.optional(Schema.String),
  entityTitle: Schema.optional(Schema.String),
  timestamp: Schema.String,
});

const DocumentJobCompletionEventSchema = Schema.Struct({
  type: Schema.Literal('document_job_completion'),
  jobId: Schema.String,
  jobType: Schema.Literal('process-url', 'process-research'),
  status: Schema.Literal('completed', 'failed'),
  documentId: Schema.String,
  error: Schema.optional(Schema.String),
});

const ConnectionEventSchema = Schema.Struct({
  type: Schema.Literal('connected'),
  userId: Schema.String,
});

const SSEEventSchema = Schema.Union(
  EntityChangeEventSchema,
  JobCompletionEventSchema,
  VoiceoverJobCompletionEventSchema,
  InfographicJobCompletionEventSchema,
  DocumentJobCompletionEventSchema,
  ActivityLoggedEventSchema,
  ConnectionEventSchema,
);

const eventsContract = oc
  .prefix('/events')
  .tag('events')
  .router({
    subscribe: oc
      .route({ method: 'GET', path: '/' })
      .output(eventIterator(std(SSEEventSchema))),
  });

export default eventsContract;
