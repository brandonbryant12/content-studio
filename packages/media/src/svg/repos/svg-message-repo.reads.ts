import { withDb } from '@repo/db/effect';
import { svgMessage, type SvgId } from '@repo/db/schema';
import { asc, eq } from 'drizzle-orm';
import type { SvgMessageRepoService } from './svg-message-repo';

export const svgMessageReadMethods: Pick<SvgMessageRepoService, 'listBySvgId'> =
  {
    listBySvgId: (svgId) =>
      withDb('svgMessageRepo.listBySvgId', (db) =>
        db
          .select()
          .from(svgMessage)
          .where(eq(svgMessage.svgId, svgId as SvgId))
          .orderBy(asc(svgMessage.createdAt)),
      ),
  };
