import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SvgRepo } from '../repos';

export interface DeleteSvgInput {
  readonly svgId: string;
}

export const deleteSvg = (input: DeleteSvgInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.svgId,
      attributes: { 'svg.id': input.svgId },
    });
    yield* repo.findByIdForUser(input.svgId, user.id);
    yield* repo.delete(input.svgId);
  }).pipe(withUseCaseSpan('useCase.deleteSvg'));
