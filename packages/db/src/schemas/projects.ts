import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';
import { user } from './auth';
import { document } from './documents';

// Enums
export const mediaTypeEnum = pgEnum('media_type', ['document', 'podcast']);

export const project = pgTable(
  'project',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_created_by_idx').on(table.createdBy),
    index('project_created_at_idx').on(table.createdAt),
  ],
);

export const projectDocument = pgTable(
  'project_document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => document.id, { onDelete: 'cascade' }),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('project_document_project_id_idx').on(table.projectId)],
);

export const projectMedia = pgTable(
  'project_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    mediaType: mediaTypeEnum('media_type').notNull(),
    mediaId: uuid('media_id').notNull(),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_media_project_id_idx').on(table.projectId),
    index('project_media_media_type_idx').on(table.mediaType),
  ],
);

export const CreateProjectSchema = v.object({
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
  description: v.optional(v.string()),
  documentIds: v.optional(v.array(v.pipe(v.string(), v.uuid()))),
});

export const UpdateProjectSchema = v.partial(
  v.object({
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
    description: v.optional(v.string()),
    documentIds: v.optional(v.array(v.pipe(v.string(), v.uuid()))),
  }),
);

export const ProjectSchema = createSelectSchema(project);
export const ProjectDocumentSchema = createSelectSchema(projectDocument);
export const ProjectMediaSchema = createSelectSchema(projectMedia);

export type Project = typeof project.$inferSelect;
export type ProjectDocument = typeof projectDocument.$inferSelect;
export type ProjectMedia = typeof projectMedia.$inferSelect;
export type MediaType = ProjectMedia['mediaType'];
export type CreateProject = v.InferInput<typeof CreateProjectSchema>;
export type UpdateProject = v.InferInput<typeof UpdateProjectSchema>;
