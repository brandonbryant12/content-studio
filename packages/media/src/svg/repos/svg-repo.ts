import type { Db, DatabaseError } from '@repo/db/effect';
import type { Effect } from 'effect';
import { Context, Layer } from 'effect';
import type { Svg, SvgStatus } from '@repo/db/schema';
import type {
  SvgGenerationInProgressError,
  SvgNotFoundError,
} from '../../errors';
import { svgReadMethods } from './svg-repo.reads';
import { svgWriteMethods } from './svg-repo.writes';

export interface InsertSvg {
  readonly title?: string;
  readonly description?: string;
  readonly svgContent?: string;
  readonly status?: SvgStatus;
  readonly createdBy: string;
}

export interface UpdateSvg {
  readonly title?: string;
  readonly description?: string;
  readonly svgContent?: string | null;
  readonly status?: SvgStatus;
}

export interface SvgListOptions {
  readonly limit?: number;
  readonly offset?: number;
}

export interface SvgRepoService {
  readonly insert: (
    data: InsertSvg,
  ) => Effect.Effect<Svg, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<Svg, SvgNotFoundError | DatabaseError, Db>;

  readonly findByIdForUser: (
    id: string,
    userId: string,
  ) => Effect.Effect<Svg, SvgNotFoundError | DatabaseError, Db>;

  readonly list: (
    userId: string,
    options?: SvgListOptions,
  ) => Effect.Effect<readonly Svg[], DatabaseError, Db>;

  readonly update: (
    id: string,
    data: UpdateSvg,
  ) => Effect.Effect<Svg, SvgNotFoundError | DatabaseError, Db>;

  readonly delete: (id: string) => Effect.Effect<void, DatabaseError, Db>;

  readonly tryAcquireGenerationLock: (
    svgId: string,
  ) => Effect.Effect<Svg, SvgGenerationInProgressError | DatabaseError, Db>;

  readonly completeGeneration: (
    svgId: string,
    svgContent: string,
    assistantMessageContent: string,
  ) => Effect.Effect<void, DatabaseError, Db>;

  readonly failGeneration: (
    svgId: string,
  ) => Effect.Effect<void, DatabaseError, Db>;
}

export class SvgRepo extends Context.Tag('@repo/media/SvgRepo')<
  SvgRepo,
  SvgRepoService
>() {}

const make: SvgRepoService = {
  ...svgReadMethods,
  ...svgWriteMethods,
};

export const SvgRepoLive: Layer.Layer<SvgRepo> = Layer.succeed(SvgRepo, make);
