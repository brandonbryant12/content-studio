import { LLM } from '@repo/ai';
import { SlideDeckStatus, SlideLayoutSchema, type SlideContent } from '@repo/db/schema';
import { Effect, Schema } from 'effect';
import { getDocumentContent } from '../../document';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { renderSlideDeckHtml } from '../render-html';
import { SlideDeckRepo } from '../repos';
import { sanitizeSlides } from '../sanitize';

export interface ExecuteSlideDeckGenerationInput {
  slideDeckId: string;
}

export interface ExecuteSlideDeckGenerationResult {
  slideDeckId: string;
  versionNumber: number;
  slideCount: number;
}

const GeneratedSlideSchema = Schema.Struct({
  title: Schema.String,
  body: Schema.optional(Schema.String),
  bullets: Schema.optional(Schema.Array(Schema.String)),
  notes: Schema.optional(Schema.String),
  layout: Schema.optional(SlideLayoutSchema),
});

const GeneratedDeckSchema = Schema.Struct({
  title: Schema.String,
  slides: Schema.Array(GeneratedSlideSchema),
});

const MAX_DOCUMENT_CHARS = 4_000;
const MAX_CONTEXT_CHARS = 12_000;

const compactWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const excerpt = (value: string, length: number): string =>
  compactWhitespace(value).slice(0, length);

const collectDocumentContext = (
  documentContents: readonly string[],
): string => {
  const sections: string[] = [];
  let total = 0;

  for (const [index, content] of documentContents.entries()) {
    if (total >= MAX_CONTEXT_CHARS) break;
    const clipped = excerpt(content, MAX_DOCUMENT_CHARS);
    if (clipped.length === 0) continue;

    const section = `Document ${index + 1}: ${clipped}`;
    sections.push(section);
    total += section.length;
  }

  return sections.join('\n\n');
};

const toSlides = (
  slides: readonly {
    title: string;
    body?: string;
    bullets?: readonly string[];
    notes?: string;
    layout?: SlideContent['layout'];
  }[],
): SlideContent[] =>
  slides.map((slide, index) => ({
    id: `slide-${index + 1}`,
    title: slide.title,
    body: slide.body,
    bullets: slide.bullets ? [...slide.bullets] : undefined,
    notes: slide.notes,
    layout: slide.layout ?? 'title_bullets',
  }));

export const executeSlideDeckGeneration = (
  input: ExecuteSlideDeckGenerationInput,
) =>
  Effect.gen(function* () {
    const repo = yield* SlideDeckRepo;
    const llm = yield* LLM;

    const slideDeck = yield* repo.findById(input.slideDeckId);

    yield* annotateUseCaseSpan({
      userId: slideDeck.createdBy,
      resourceId: input.slideDeckId,
      attributes: { 'slideDeck.id': input.slideDeckId },
    });

    const documentContents = yield* Effect.all(
      slideDeck.sourceDocumentIds.map((id) =>
        getDocumentContent({ id }).pipe(
          Effect.map((result) => result.content),
          Effect.catchAll(() => Effect.succeed('')),
        ),
      ),
      { concurrency: 4 },
    );

    const contextBlock = collectDocumentContext(documentContents);
    const prompt = [
      `Generate a professional slide deck titled around: "${slideDeck.prompt ?? slideDeck.title}".`,
      `Theme preset: ${slideDeck.theme}.`,
      'Return concise slides with clear structure and no markdown wrappers.',
      '',
      'Source material:',
      contextBlock.length > 0 ? contextBlock : 'No source documents provided.',
    ].join('\n');

    const generated = yield* llm.generate({
      prompt,
      schema: GeneratedDeckSchema,
      temperature: 0.4,
      maxTokens: 2_400,
    });

    const generatedTitle = generated.object.title.trim();
    const normalizedSlides = sanitizeSlides(
      toSlides(generated.object.slides ?? []),
    );

    const fallbackSlides =
      normalizedSlides.length > 0
        ? normalizedSlides
        : [
            {
              id: 'slide-1',
              title: generatedTitle || slideDeck.title,
              body:
                slideDeck.prompt?.trim() || 'Overview generated from your input.',
              bullets: [],
              layout: 'title_bullets',
            } satisfies SlideContent,
          ];

    const title = generatedTitle.length > 0 ? generatedTitle : slideDeck.title;
    const html = renderSlideDeckHtml({
      title,
      theme: slideDeck.theme,
      slides: fallbackSlides,
    });

    const existingVersions = yield* repo.listVersions(slideDeck.id);
    const nextVersion = (existingVersions.at(-1)?.versionNumber ?? 0) + 1;

    yield* repo.insertVersion({
      slideDeckId: slideDeck.id,
      versionNumber: nextVersion,
      prompt: slideDeck.prompt ?? undefined,
      sourceDocumentIds: slideDeck.sourceDocumentIds,
      theme: slideDeck.theme,
      slides: fallbackSlides,
      generatedHtml: html,
    });

    yield* repo.update(slideDeck.id, {
      title,
      slides: fallbackSlides,
      generatedHtml: html,
      status: SlideDeckStatus.READY,
      errorMessage: null,
    });

    yield* repo.deleteOldVersions(slideDeck.id, 10);

    return {
      slideDeckId: slideDeck.id,
      versionNumber: nextVersion,
      slideCount: fallbackSlides.length,
    } satisfies ExecuteSlideDeckGenerationResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const repo = yield* SlideDeckRepo;

        yield* repo
          .update(input.slideDeckId, {
            status: SlideDeckStatus.FAILED,
            errorMessage: 'Slide generation failed. Please try again.',
          })
          .pipe(Effect.catchAll(() => Effect.void));

        return yield* Effect.fail(error);
      }),
    ),
    withUseCaseSpan('useCase.executeSlideDeckGeneration'),
  );
