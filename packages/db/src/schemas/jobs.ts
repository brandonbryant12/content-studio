import { pgTable, text, timestamp, uuid, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-valibot';
import { user } from './auth';

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const job = pgTable(
  'job',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(),
    status: jobStatusEnum('status').notNull().default('pending'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    result: jsonb('result').$type<Record<string, unknown>>(),
    error: text('error'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp('started_at', { mode: 'date', withTimezone: true }),
    completedAt: timestamp('completed_at', { mode: 'date', withTimezone: true }),
  },
  (table) => [
    index('job_created_by_idx').on(table.createdBy),
    index('job_status_idx').on(table.status),
    index('job_type_status_idx').on(table.type, table.status),
  ],
);

export const JobSchema = createSelectSchema(job);

export type Job = typeof job.$inferSelect;
export type JobStatus = Job['status'];
