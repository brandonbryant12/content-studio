import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';
import { user } from './auth';
import { contentTypeEnum, type ContentType } from './media-types';

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

/**
 * Links content items to projects.
 * All content types (documents, podcasts, videos, etc.) use this table.
 */
export const projectMedia = pgTable(
  'project_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    mediaType: contentTypeEnum('media_type').notNull(),
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
export const ProjectMediaSchema = createSelectSchema(projectMedia);

export type Project = typeof project.$inferSelect;
export type ProjectMedia = typeof projectMedia.$inferSelect;
export type MediaType = ContentType;
export type CreateProject = v.InferInput<typeof CreateProjectSchema>;
export type UpdateProject = v.InferInput<typeof UpdateProjectSchema>;
