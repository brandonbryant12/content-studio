import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SvgRepo } from '../repos';

export interface ListSvgsInput {
  readonly limit?: number;
  readonly offset?: number;
}

export const listSvgs = (input: ListSvgsInput = {}) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
    });
    return yield* repo.list(user.id, {
      limit: input.limit,
      offset: input.offset,
    });
  }).pipe(withUseCaseSpan('useCase.listSvgs'));
