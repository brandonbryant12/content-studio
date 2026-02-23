import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { SvgRepo } from '../repos';

export interface UpdateSvgInput {
  readonly svgId: string;
  readonly title?: string;
  readonly description?: string;
}

export const updateSvg = (input: UpdateSvgInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;

    yield* repo.findByIdForUser(input.svgId, user.id);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.svgId,
      attributes: { 'svg.id': input.svgId },
    });

    return yield* repo.update(input.svgId, {
      title: input.title,
      description: input.description,
    });
  }).pipe(Effect.withSpan('useCase.updateSvg'));
