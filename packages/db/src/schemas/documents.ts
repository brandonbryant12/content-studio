import { pgTable, text, timestamp, uuid, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';
import { user } from './auth';

export const document = pgTable(
  'document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    wordCount: integer('word_count').notNull().default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
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
    index('document_created_by_idx').on(table.createdBy),
    index('document_created_at_idx').on(table.createdAt),
  ],
);

export const CreateDocumentSchema = v.omit(
  createInsertSchema(document, {
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
    content: v.pipe(v.string(), v.minLength(1)),
  }),
  ['id', 'wordCount', 'createdAt', 'updatedAt', 'createdBy'],
);

export const UpdateDocumentSchema = v.partial(
  v.object({
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
    content: v.pipe(v.string(), v.minLength(1)),
    metadata: v.optional(v.record(v.string(), v.unknown())),
  }),
);

export const DocumentSchema = createSelectSchema(document);

export type Document = typeof document.$inferSelect;
export type CreateDocument = v.InferInput<typeof CreateDocumentSchema>;
export type UpdateDocument = v.InferInput<typeof UpdateDocumentSchema>;
