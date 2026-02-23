import { withDb } from '@repo/db/effect';
import { svg, type Svg, type SvgId } from '@repo/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { SvgNotFoundError } from '../../errors';
import type { SvgRepoService } from './svg-repo';

const requireSvg = (svgId: string) =>
  Effect.flatMap((row: Svg | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new SvgNotFoundError({ svgId })),
  );

export const svgReadMethods: Pick<
  SvgRepoService,
  'findById' | 'findByIdForUser' | 'list'
> = {
  findById: (id) =>
    withDb('svgRepo.findById', async (db) => {
      const [row] = await db
        .select()
        .from(svg)
        .where(eq(svg.id, id as SvgId))
        .limit(1);
      return row ?? null;
    }).pipe(requireSvg(id)),

  findByIdForUser: (id, userId) =>
    withDb('svgRepo.findByIdForUser', async (db) => {
      const [row] = await db
        .select()
        .from(svg)
        .where(and(eq(svg.id, id as SvgId), eq(svg.createdBy, userId)))
        .limit(1);
      return row ?? null;
    }).pipe(requireSvg(id)),

  list: (userId, options = {}) =>
    withDb('svgRepo.list', (db) =>
      db
        .select()
        .from(svg)
        .where(eq(svg.createdBy, userId))
        .orderBy(desc(svg.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0),
    ),
};
