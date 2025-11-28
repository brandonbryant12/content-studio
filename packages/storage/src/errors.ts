import { Schema } from 'effect';

export class StorageError extends Schema.TaggedError<StorageError>()(
  'StorageError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

export class StorageNotFoundError extends Schema.TaggedError<StorageNotFoundError>()(
  'StorageNotFoundError',
  {
    key: Schema.String,
  },
) {}

export class StorageUploadError extends Schema.TaggedError<StorageUploadError>()(
  'StorageUploadError',
  {
    key: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}
