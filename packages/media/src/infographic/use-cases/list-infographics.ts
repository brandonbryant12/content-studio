import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListInfographicsInput {
  limit?: number;
  offset?: number;
}

// =============================================================================
// Use Case
// =============================================================================

const listInfographicsUseCase = defineAuthedUseCase<ListInfographicsInput>()({
  name: 'useCase.listInfographics',
  span: ({ input, user }) => ({
    collection: 'infographics',
    attributes: {
      'owner.id': user.id,
      'pagination.limit': input.limit ?? 50,
      'pagination.offset': input.offset ?? 0,
    },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const repo = yield* InfographicRepo;
      return yield* repo.list({
        createdBy: user.id,
        limit: input.limit,
        offset: input.offset,
      });
    }),
});

export const listInfographics = (input: ListInfographicsInput = {}) =>
  listInfographicsUseCase(input);
