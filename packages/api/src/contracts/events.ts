/**
 * Server-Sent Events (SSE) event types for real-time updates
 */

import { oc, eventIterator } from '@orpc/contract';
import { Schema } from 'effect';

// =============================================================================
// TypeScript Types (used by handlers, workers, etc.)
// =============================================================================

export type EntityType = 'podcast' | 'document' | 'voiceover';
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

export interface ConnectionEvent {
  type: 'connected';
  userId: string;
}

export type SSEEvent =
  | EntityChangeEvent
  | JobCompletionEvent
  | VoiceoverJobCompletionEvent
  | ConnectionEvent;

// =============================================================================
// Effect Schemas (for ORPC contract validation)
// =============================================================================

const std = Schema.standardSchemaV1;

const EntityChangeEventSchema = Schema.Struct({
  type: Schema.Literal('entity_change'),
  entityType: Schema.Literal('podcast', 'document', 'voiceover'),
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

const ConnectionEventSchema = Schema.Struct({
  type: Schema.Literal('connected'),
  userId: Schema.String,
});

const SSEEventSchema = Schema.Union(
  EntityChangeEventSchema,
  JobCompletionEventSchema,
  VoiceoverJobCompletionEventSchema,
  ConnectionEventSchema,
);

// =============================================================================
// Contract
// =============================================================================

const eventsContract = oc
  .prefix('/events')
  .tag('events')
  .router({
    subscribe: oc
      .route({ method: 'GET', path: '/' })
      .output(eventIterator(std(SSEEventSchema))),
  });

export default eventsContract;
