import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { SlideContent, SlideDeckTheme } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SlideDeckRepo } from '../repos';
import { sanitizeSlides, sanitizeSourceDocumentIds } from '../sanitize';

export interface UpdateSlideDeckInput {
  id: string;
  title?: string;
  prompt?: string;
  sourceDocumentIds?: readonly string[];
  theme?: SlideDeckTheme;
  slides?: readonly SlideContent[];
}

export const updateSlideDeck = (input: UpdateSlideDeckInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SlideDeckRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'slideDeck.id': input.id },
    });

    yield* repo.findByIdForUser(input.id, user.id);

    return yield* repo.update(input.id, {
      title: input.title,
      prompt: input.prompt,
      sourceDocumentIds: input.sourceDocumentIds
        ? sanitizeSourceDocumentIds(input.sourceDocumentIds)
        : undefined,
      theme: input.theme,
      slides: input.slides ? sanitizeSlides(input.slides) : undefined,
    });
  }).pipe(withUseCaseSpan('useCase.updateSlideDeck'));
