import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  type SvgId,
  type SvgMessageId,
  SvgIdSchema,
  SvgMessageIdSchema,
  generateSvgId,
  generateSvgMessageId,
} from './brands';
import { createEffectSerializer } from './serialization';

// =============================================================================
// Enums
// =============================================================================

export const svgStatusEnum = pgEnum('svg_status', [
  'draft',
  'generating',
  'ready',
  'failed',
]);

export const svgMessageRoleEnum = pgEnum('svg_message_role', [
  'user',
  'assistant',
]);

export const SvgStatus = {
  DRAFT: 'draft',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export const SvgMessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const;

// =============================================================================
// Tables
// =============================================================================

export const svg = pgTable(
  'svg',
  {
    id: varchar('id', { length: 20 })
      .$type<SvgId>()
      .$default(generateSvgId)
      .primaryKey(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }),
    description: text('description'),
    svgContent: text('svg_content'),
    status: svgStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('svg_createdBy_idx').on(table.createdBy)],
);

export const svgMessage = pgTable(
  'svg_message',
  {
    id: varchar('id', { length: 20 })
      .$type<SvgMessageId>()
      .$default(generateSvgMessageId)
      .primaryKey(),
    svgId: varchar('svg_id', { length: 20 })
      .notNull()
      .references(() => svg.id, { onDelete: 'cascade' })
      .$type<SvgId>(),
    role: svgMessageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('svg_message_svgId_idx').on(table.svgId)],
);

// =============================================================================
// Effect Schemas
// =============================================================================

export const SvgStatusSchema = Schema.Literal(...svgStatusEnum.enumValues);

export const SvgMessageRoleSchema = Schema.Literal(
  ...svgMessageRoleEnum.enumValues,
);

export const CreateSvgSchema = Schema.Struct({
  title: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  description: Schema.optional(Schema.String),
});

export const UpdateSvgSchema = Schema.Struct({
  title: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  description: Schema.optional(Schema.String),
});

export const SvgOutputSchema = Schema.Struct({
  id: SvgIdSchema,
  createdBy: Schema.String,
  title: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  svgContent: Schema.NullOr(Schema.String),
  status: SvgStatusSchema,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const SvgMessageOutputSchema = Schema.Struct({
  id: SvgMessageIdSchema,
  svgId: SvgIdSchema,
  role: SvgMessageRoleSchema,
  content: Schema.String,
  createdAt: Schema.String,
});

// =============================================================================
// Types
// =============================================================================

export type Svg = typeof svg.$inferSelect;
export type SvgStatus = Svg['status'];
export type SvgOutput = typeof SvgOutputSchema.Type;
export type CreateSvg = typeof CreateSvgSchema.Type;
export type UpdateSvg = typeof UpdateSvgSchema.Type;

export type SvgMessage = typeof svgMessage.$inferSelect;
export type SvgMessageRole = SvgMessage['role'];
export type SvgMessageOutput = typeof SvgMessageOutputSchema.Type;

// =============================================================================
// Serialization
// =============================================================================

const svgTransform = (row: Svg): SvgOutput => ({
  id: row.id,
  createdBy: row.createdBy,
  title: row.title ?? null,
  description: row.description ?? null,
  svgContent: row.svgContent ?? null,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const svgMessageTransform = (row: SvgMessage): SvgMessageOutput => ({
  id: row.id,
  svgId: row.svgId,
  role: row.role,
  content: row.content,
  createdAt: row.createdAt.toISOString(),
});

export const serializeSvgEffect = createEffectSerializer('svg', svgTransform);

export const serializeSvgMessageEffect = createEffectSerializer(
  'svgMessage',
  svgMessageTransform,
);

export const serializeSvg = svgTransform;
export const serializeSvgMessage = svgMessageTransform;
