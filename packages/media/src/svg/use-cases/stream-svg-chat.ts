import { streamSvgChat as streamSvgChatModel } from '@repo/ai/chat';
import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { Db } from '@repo/db/effect';
import type { SvgMessage } from '@repo/db/schema';
import { annotateUseCaseSpan } from '../../shared';
import { SvgMessageRepo, SvgRepo } from '../repos';
import { extractSvgBlock, sanitizeSvg } from '../sanitize-svg';

export interface StreamSvgChatInput {
  readonly svgId: string;
  readonly message: string;
}

const toUiMessage = (message: SvgMessage) => ({
  id: message.id,
  role: message.role,
  parts: [{ type: 'text' as const, text: message.content }],
});

export const streamSvgChat = (input: StreamSvgChatInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;
    const messageRepo = yield* SvgMessageRepo;
    const dbContext = yield* Effect.context<Db>();
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.svgId,
      attributes: { 'svg.id': input.svgId },
    });

    const runDb = <A, E>(effect: Effect.Effect<A, E, Db>) =>
      Effect.runPromise(effect.pipe(Effect.provide(dbContext)));

    const streamEffect = Effect.gen(function* () {
      yield* repo.findByIdForUser(input.svgId, user.id);
      yield* repo.tryAcquireGenerationLock(input.svgId);

      yield* messageRepo.insert({
        svgId: input.svgId,
        role: 'user',
        content: input.message,
      });

      const messages = yield* messageRepo.listBySvgId(input.svgId);

      return yield* streamSvgChatModel({
        messages: messages.map(toUiMessage),
        onFinish: async (text) => {
          const extractedSvg = extractSvgBlock(text);
          const sanitizedSvg = extractedSvg ? sanitizeSvg(extractedSvg) : null;

          if (!sanitizedSvg) {
            await runDb(
              Effect.gen(function* () {
                yield* messageRepo.insert({
                  svgId: input.svgId,
                  role: 'assistant',
                  content: text,
                });
                yield* repo.failGeneration(input.svgId);
              }),
            );
            return;
          }

          await runDb(
            repo.completeGeneration(input.svgId, sanitizedSvg, text),
          );
        },
        onAbort: async () => {
          await runDb(repo.failGeneration(input.svgId));
        },
      });
    });

    return yield* streamEffect.pipe(
      Effect.tapError(() => repo.failGeneration(input.svgId)),
    );
  }).pipe(Effect.withSpan('useCase.streamSvgChat'));
