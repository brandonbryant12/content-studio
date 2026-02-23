import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { SvgRepo } from '../repos';

export interface DeleteSvgInput {
  readonly svgId: string;
}

export const deleteSvg = (input: DeleteSvgInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;

    yield* repo.findByIdForUser(input.svgId, user.id);
    yield* repo.delete(input.svgId);
  }).pipe(
    Effect.withSpan('useCase.deleteSvg', {
      attributes: { 'svg.id': input.svgId },
    }),
  );
