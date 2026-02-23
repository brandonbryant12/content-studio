import type { Db, DatabaseError } from '@repo/db/effect';
import type { Effect } from 'effect';
import { Context, Layer } from 'effect';
import type { SvgMessage } from '@repo/db/schema';
import { svgMessageReadMethods } from './svg-message-repo.reads';
import { svgMessageWriteMethods } from './svg-message-repo.writes';

export interface InsertSvgMessage {
  readonly svgId: string;
  readonly role: SvgMessage['role'];
  readonly content: string;
}

export interface SvgMessageRepoService {
  readonly listBySvgId: (
    svgId: string,
  ) => Effect.Effect<readonly SvgMessage[], DatabaseError, Db>;

  readonly insert: (
    data: InsertSvgMessage,
  ) => Effect.Effect<SvgMessage, DatabaseError, Db>;
}

export class SvgMessageRepo extends Context.Tag('@repo/media/SvgMessageRepo')<
  SvgMessageRepo,
  SvgMessageRepoService
>() {}

const make: SvgMessageRepoService = {
  ...svgMessageReadMethods,
  ...svgMessageWriteMethods,
};

export const SvgMessageRepoLive: Layer.Layer<SvgMessageRepo> = Layer.succeed(
  SvgMessageRepo,
  make,
);
