import { withDb } from '@repo/db/effect';
import { SvgStatus, svg, svgMessage, type Svg, type SvgId } from '@repo/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { Effect } from 'effect';
import {
  SvgGenerationInProgressError,
  SvgNotFoundError,
} from '../../errors';
import type { InsertSvg, SvgRepoService, UpdateSvg } from './svg-repo';

const requireSvg = (svgId: string) =>
  Effect.flatMap((row: Svg | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new SvgNotFoundError({ svgId })),
  );

const requireGenerationLock = (svgId: string) =>
  Effect.flatMap((row: Svg | null | undefined) =>
    row
      ? Effect.succeed(row)
      : Effect.fail(new SvgGenerationInProgressError({ svgId })),
  );

export const svgWriteMethods: Pick<
  SvgRepoService,
  | 'insert'
  | 'update'
  | 'delete'
  | 'tryAcquireGenerationLock'
  | 'completeGeneration'
  | 'failGeneration'
> = {
  insert: (data: InsertSvg) =>
    withDb('svgRepo.insert', async (db) => {
      const [row] = await db
        .insert(svg)
        .values({
          title: data.title,
          description: data.description,
          svgContent: data.svgContent,
          status: data.status ?? SvgStatus.DRAFT,
          createdBy: data.createdBy,
        })
        .returning();
      return row!;
    }),

  update: (id: string, data: UpdateSvg) =>
    withDb('svgRepo.update', async (db) => {
      const updateValues: Record<string, unknown> = {
        ...Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined),
        ),
        updatedAt: new Date(),
      };

      const [row] = await db
        .update(svg)
        .set(updateValues)
        .where(eq(svg.id, id as SvgId))
        .returning();
      return row ?? null;
    }).pipe(requireSvg(id)),

  delete: (id: string) =>
    withDb('svgRepo.delete', async (db) => {
      await db.delete(svg).where(eq(svg.id, id as SvgId));
    }),

  tryAcquireGenerationLock: (svgId: string) =>
    withDb('svgRepo.tryAcquireGenerationLock', async (db) => {
      const [row] = await db
        .update(svg)
        .set({
          status: SvgStatus.GENERATING,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(svg.id, svgId as SvgId),
            ne(svg.status, SvgStatus.GENERATING),
          ),
        )
        .returning();
      return row ?? null;
    }).pipe(requireGenerationLock(svgId)),

  completeGeneration: (svgId: string, svgContent: string, assistantMessage) =>
    withDb('svgRepo.completeGeneration', async (db) => {
      await db.transaction(async (tx) => {
        await tx.insert(svgMessage).values({
          svgId: svgId as SvgId,
          role: 'assistant',
          content: assistantMessage,
        });

        await tx
          .update(svg)
          .set({
            svgContent,
            status: SvgStatus.READY,
            updatedAt: new Date(),
          })
          .where(eq(svg.id, svgId as SvgId));
      });
    }),

  failGeneration: (svgId: string) =>
    withDb('svgRepo.failGeneration', async (db) => {
      await db
        .update(svg)
        .set({
          status: SvgStatus.FAILED,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(svg.id, svgId as SvgId),
            eq(svg.status, SvgStatus.GENERATING),
          ),
        );
    }),
};
