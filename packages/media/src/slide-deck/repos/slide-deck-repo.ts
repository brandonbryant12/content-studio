import { Context, Layer } from 'effect';
import type { SlideDeckNotFound } from '../../errors';
import type { Db, DatabaseError } from '@repo/db/effect';
import type {
  SlideDeck,
  SlideDeckId,
  SlideDeckStatusType,
  SlideDeckTheme,
  SlideDeckVersion,
  DocumentId,
  SlideContent,
} from '@repo/db/schema';
import type { Effect } from 'effect';
import { slideDeckReadMethods } from './slide-deck-repo.reads';
import { slideDeckWriteMethods } from './slide-deck-repo.writes';

export interface InsertSlideDeck {
  id: SlideDeckId;
  title: string;
  prompt?: string;
  sourceDocumentIds?: DocumentId[];
  theme: SlideDeckTheme;
  slides?: SlideContent[];
  generatedHtml?: string;
  status?: SlideDeckStatusType;
  createdBy: string;
}

export interface UpdateSlideDeck {
  title?: string;
  prompt?: string;
  sourceDocumentIds?: DocumentId[];
  theme?: SlideDeckTheme;
  slides?: SlideContent[];
  generatedHtml?: string | null;
  status?: SlideDeckStatusType;
  errorMessage?: string | null;
}

export interface InsertSlideDeckVersion {
  slideDeckId: SlideDeckId;
  versionNumber: number;
  prompt?: string;
  sourceDocumentIds?: DocumentId[];
  theme: SlideDeckTheme;
  slides: SlideContent[];
  generatedHtml: string;
}

export interface ListOptions {
  createdBy: string;
  limit?: number;
  offset?: number;
}

export interface SlideDeckRepoService {
  readonly insert: (
    data: InsertSlideDeck,
  ) => Effect.Effect<SlideDeck, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<SlideDeck, SlideDeckNotFound | DatabaseError, Db>;

  readonly findByIdForUser: (
    id: string,
    userId: string,
  ) => Effect.Effect<SlideDeck, SlideDeckNotFound | DatabaseError, Db>;

  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly SlideDeck[], DatabaseError, Db>;

  readonly update: (
    id: string,
    data: UpdateSlideDeck,
  ) => Effect.Effect<SlideDeck, SlideDeckNotFound | DatabaseError, Db>;

  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  readonly insertVersion: (
    data: InsertSlideDeckVersion,
  ) => Effect.Effect<SlideDeckVersion, DatabaseError, Db>;

  readonly listVersions: (
    slideDeckId: string,
  ) => Effect.Effect<readonly SlideDeckVersion[], DatabaseError, Db>;

  readonly deleteOldVersions: (
    slideDeckId: string,
    keepCount: number,
  ) => Effect.Effect<number, DatabaseError, Db>;
}

export class SlideDeckRepo extends Context.Tag('@repo/media/SlideDeckRepo')<
  SlideDeckRepo,
  SlideDeckRepoService
>() {}

const make: SlideDeckRepoService = {
  ...slideDeckReadMethods,
  ...slideDeckWriteMethods,
};

export const SlideDeckRepoLive: Layer.Layer<SlideDeckRepo> = Layer.succeed(
  SlideDeckRepo,
  make,
);
