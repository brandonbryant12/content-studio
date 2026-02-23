import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { SvgRepo } from '../repos';

export interface ListSvgsInput {
  readonly limit?: number;
  readonly offset?: number;
}

export const listSvgs = (input: ListSvgsInput = {}) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
    });
    const repo = yield* SvgRepo;

    return yield* repo.list(user.id, {
      limit: input.limit,
      offset: input.offset,
    });
  }).pipe(Effect.withSpan('useCase.listSvgs'));
