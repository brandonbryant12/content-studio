import { withDb } from '@repo/db/effect';
import { svgMessage, type SvgId } from '@repo/db/schema';
import type {
  InsertSvgMessage,
  SvgMessageRepoService,
} from './svg-message-repo';

export const svgMessageWriteMethods: Pick<SvgMessageRepoService, 'insert'> = {
  insert: (data: InsertSvgMessage) =>
    withDb('svgMessageRepo.insert', async (db) => {
      const [row] = await db
        .insert(svgMessage)
        .values({
          svgId: data.svgId as SvgId,
          role: data.role,
          content: data.content,
        })
        .returning();
      return row!;
    }),
};
