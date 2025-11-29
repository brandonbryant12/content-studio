import { customType, pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Custom bytea type for storing binary data.
 * Drizzle doesn't have native bytea support, so we use customType.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: Buffer): Buffer {
    return Buffer.from(value);
  },
});

/**
 * Storage blobs table - stores binary content in the database.
 * Used by DatabaseStorageLive for persistent blob storage without external services.
 */
export const storageBlob = pgTable(
  'storage_blob',
  {
    /** Storage key (path-like identifier, e.g., "documents/uuid.docx") */
    key: text('key').primaryKey(),
    /** Binary content */
    data: bytea('data').notNull(),
    /** MIME type of the content */
    contentType: text('content_type').notNull(),
    /** When the blob was created */
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    /** When the blob was last updated */
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('storage_blob_created_at_idx').on(table.createdAt)],
);

export type StorageBlob = typeof storageBlob.$inferSelect;
export type InsertStorageBlob = typeof storageBlob.$inferInsert;
