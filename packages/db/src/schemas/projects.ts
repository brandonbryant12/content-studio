import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';
import { user } from './auth';
import {
  document,
  DocumentOutputSchema,
  serializeDocument,
  type Document,
  type DocumentOutput,
} from './documents';

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
 * Simple junction table linking documents to projects.
 * Replaces the polymorphic projectMedia table for document relationships.
 */
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
  (table) => [
    index('project_document_project_id_idx').on(table.projectId),
    index('project_document_document_id_idx').on(table.documentId),
    unique('project_document_unique').on(table.projectId, table.documentId),
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

// =============================================================================
// Output Schemas - for API responses (Date → string)
// =============================================================================

export const ProjectOutputSchema = v.object({
  id: v.string(),
  title: v.string(),
  description: v.nullable(v.string()),
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const ProjectDocumentOutputSchema = v.object({
  id: v.string(),
  projectId: v.string(),
  documentId: v.string(),
  order: v.number(),
  createdAt: v.string(),
});

export const ProjectWithDocumentsOutputSchema = v.object({
  ...ProjectOutputSchema.entries,
  documents: v.array(ProjectDocumentOutputSchema),
});

export const ProjectFullOutputSchema = v.object({
  ...ProjectOutputSchema.entries,
  documents: v.array(DocumentOutputSchema),
  outputCounts: v.object({
    podcasts: v.number(),
  }),
});

// =============================================================================
// Types
// =============================================================================

export type Project = typeof project.$inferSelect;
export type ProjectDocument = typeof projectDocument.$inferSelect;
export type ProjectOutput = v.InferOutput<typeof ProjectOutputSchema>;
export type ProjectDocumentOutput = v.InferOutput<typeof ProjectDocumentOutputSchema>;
export type ProjectWithDocumentsOutput = v.InferOutput<typeof ProjectWithDocumentsOutputSchema>;
export type ProjectFullOutput = v.InferOutput<typeof ProjectFullOutputSchema>;
export type CreateProject = v.InferInput<typeof CreateProjectSchema>;
export type UpdateProject = v.InferInput<typeof UpdateProjectSchema>;

// =============================================================================
// Serializers - co-located with entity
// =============================================================================

/**
 * Serialize a Project to API output format.
 */
export const serializeProject = (project: Project): ProjectOutput => ({
  id: project.id,
  title: project.title,
  description: project.description,
  createdBy: project.createdBy,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

/**
 * Serialize a ProjectDocument junction to API output format.
 */
export const serializeProjectDocument = (doc: ProjectDocument): ProjectDocumentOutput => ({
  id: doc.id,
  projectId: doc.projectId,
  documentId: doc.documentId,
  order: doc.order,
  createdAt: doc.createdAt.toISOString(),
});

/**
 * Serialize a Project with junction records.
 */
export const serializeProjectWithDocuments = (
  project: Project & { documents: ProjectDocument[] },
): ProjectWithDocumentsOutput => ({
  ...serializeProject(project),
  documents: project.documents.map(serializeProjectDocument),
});

/**
 * Serialize a full Project with resolved documents.
 */
export const serializeProjectFull = (
  project: Project & { documents: Document[]; outputCounts: { podcasts: number } },
): ProjectFullOutput => ({
  ...serializeProject(project),
  documents: project.documents.map(serializeDocument),
  outputCounts: project.outputCounts,
});
