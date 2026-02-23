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
    const repo = yield* SvgRepo;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
      attributes: {
        'pagination.limit': input.limit,
        'pagination.offset': input.offset,
      },
    });

    return yield* repo.list(user.id, {
      limit: input.limit,
      offset: input.offset,
    });
  }).pipe(Effect.withSpan('useCase.listSvgs'));
