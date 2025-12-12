import { Context } from 'effect';
import type {
  StorageError,
  StorageNotFoundError,
  StorageUploadError,
} from './errors';
import type { Effect } from 'effect';

export interface StorageService {
  readonly upload: (
    key: string,
    data: Buffer,
    contentType: string,
  ) => Effect.Effect<string, StorageUploadError>;

  readonly download: (
    key: string,
  ) => Effect.Effect<Buffer, StorageError | StorageNotFoundError>;

  readonly delete: (key: string) => Effect.Effect<void, StorageError>;

  readonly getUrl: (key: string) => Effect.Effect<string, StorageError>;

  readonly exists: (key: string) => Effect.Effect<boolean, StorageError>;
}

export class Storage extends Context.Tag('@repo/storage/Storage')<
  Storage,
  StorageService
>() {}
