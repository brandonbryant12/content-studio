import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { SvgMessageRepo, SvgRepo } from '../repos';

export interface ListMessagesInput {
  readonly svgId: string;
}

export const listMessages = (input: ListMessagesInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;
    const messageRepo = yield* SvgMessageRepo;

    yield* repo.findByIdForUser(input.svgId, user.id);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.svgId,
      attributes: { 'svg.id': input.svgId },
    });
    return yield* messageRepo.listBySvgId(input.svgId);
  }).pipe(Effect.withSpan('useCase.listMessages'));
