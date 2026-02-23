import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { SvgRepo } from '../repos';

export interface GetSvgInput {
  readonly svgId: string;
}

export const getSvg = (input: GetSvgInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.svgId,
      attributes: { 'svg.id': input.svgId },
    });

    return yield* repo.findByIdForUser(input.svgId, user.id);
  }).pipe(Effect.withSpan('useCase.getSvg'));
