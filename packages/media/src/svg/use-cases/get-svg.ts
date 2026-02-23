import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { SvgRepo } from '../repos';

export interface GetSvgInput {
  readonly svgId: string;
}

export const getSvg = (input: GetSvgInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;

    return yield* repo.findByIdForUser(input.svgId, user.id);
  }).pipe(
    Effect.withSpan('useCase.getSvg', {
      attributes: { 'svg.id': input.svgId },
    }),
  );
