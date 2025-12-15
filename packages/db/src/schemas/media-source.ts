import {
  pgTable,
  uuid,
  integer,
  timestamp,
  index,
  jsonb,
  text,
} from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';
import { contentTypeEnum, type ContentType } from './media-types';

/**
 * Generic source relationship table.
 * Links any content item to its source content items.
 *
 * This replaces type-specific junction tables like `podcastDocument`.
 * Any content type can derive from any compatible content type.
 */
export const mediaSource = pgTable(
  'media_source',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // The content being created (target)
    targetType: contentTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),

    // The source content
    sourceType: contentTypeEnum('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),

    // Ordering of sources (for ordered inputs)
    order: integer('order').notNull().default(0),

    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Find all sources for a given target
    index('media_source_target_idx').on(table.targetType, table.targetId),
    // Find all targets that use a given source
    index('media_source_source_idx').on(table.sourceType, table.sourceId),
  ],
);

/**
 * Generation context stored with AI-generated content.
 * Tracks the exact prompts and parameters used for reproducibility.
 */
export interface GenerationContext {
  // The system prompt template used
  systemPromptTemplate: string;

  // User's custom instructions
  userInstructions: string;

  // References to source media (IDs only, not full content)
  sourceMediaRefs: Array<{
    mediaType: ContentType;
    mediaId: string;
  }>;

  // AI model information
  modelId: string;
  modelParams?: {
    temperature?: number;
    maxTokens?: number;
    [key: string]: unknown;
  };

  // When this content was generated
  generatedAt: string; // ISO date string
}

/**
 * Valibot schema for GenerationContext validation
 */
export const GenerationContextSchema = v.object({
  systemPromptTemplate: v.string(),
  userInstructions: v.string(),
  sourceMediaRefs: v.array(
    v.object({
      mediaType: v.picklist([
        'document',
        'podcast',
        'video',
        'article',
        'social',
        'graphic',
      ]),
      mediaId: v.pipe(v.string(), v.uuid()),
    }),
  ),
  modelId: v.string(),
  modelParams: v.optional(
    v.object({
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
    }),
  ),
  generatedAt: v.string(),
});

export const MediaSourceSchema = createSelectSchema(mediaSource);

export type MediaSource = typeof mediaSource.$inferSelect;
export type NewMediaSource = typeof mediaSource.$inferInsert;
