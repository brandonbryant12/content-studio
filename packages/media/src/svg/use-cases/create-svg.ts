import { getCurrentUser } from '@repo/auth/policy';
import { SvgStatus } from '@repo/db/schema';
import { Effect } from 'effect';
import { SvgRepo } from '../repos';

export interface CreateSvgInput {
  readonly title?: string;
  readonly description?: string;
}

export const createSvg = (input: CreateSvgInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SvgRepo;

    return yield* repo.insert({
      title: input.title,
      description: input.description,
      status: SvgStatus.DRAFT,
      createdBy: user.id,
    });
  }).pipe(Effect.withSpan('useCase.createSvg'));
