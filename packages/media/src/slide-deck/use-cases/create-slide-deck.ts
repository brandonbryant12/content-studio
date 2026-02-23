import { getCurrentUser } from '@repo/auth/policy';
import {
  generateSlideDeckId,
  type SlideContent,
  type SlideDeckTheme,
} from '@repo/db/schema';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SlideDeckRepo } from '../repos';
import { sanitizeSlides, sanitizeSourceDocumentIds } from '../sanitize';

export interface CreateSlideDeckInput {
  title: string;
  prompt?: string;
  sourceDocumentIds?: readonly string[];
  theme?: SlideDeckTheme;
  slides?: readonly SlideContent[];
}

export const createSlideDeck = (input: CreateSlideDeckInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SlideDeckRepo;

    const slideDeck = yield* repo.insert({
      id: generateSlideDeckId(),
      title: input.title,
      prompt: input.prompt,
      sourceDocumentIds: sanitizeSourceDocumentIds(input.sourceDocumentIds ?? []),
      theme: input.theme ?? 'executive',
      slides: sanitizeSlides(input.slides ?? []),
      status: 'draft',
      createdBy: user.id,
    });

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: slideDeck.id,
      attributes: { 'slideDeck.id': slideDeck.id },
    });

    return slideDeck;
  }).pipe(withUseCaseSpan('useCase.createSlideDeck'));
