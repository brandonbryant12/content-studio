import type { DocumentId, SlideContent } from '@repo/db/schema';

const toNonEmpty = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const sanitizeSourceDocumentIds = (
  ids: readonly string[],
): DocumentId[] =>
  [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))].map(
    (id) => id as DocumentId,
  );

export const sanitizeSlides = (slides: readonly SlideContent[]): SlideContent[] =>
  slides
    .map((slide, index) => {
      const title = toNonEmpty(slide.title) ?? `Slide ${index + 1}`;
      const body = toNonEmpty(slide.body);
      const notes = toNonEmpty(slide.notes);
      const imageUrl = toNonEmpty(slide.imageUrl);
      const bullets = (slide.bullets ?? [])
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      const sourceDocumentIds = slide.sourceDocumentIds
        ? sanitizeSourceDocumentIds(slide.sourceDocumentIds)
        : undefined;

      return {
        id: toNonEmpty(slide.id) ?? `slide-${index + 1}`,
        title,
        body,
        notes,
        imageUrl,
        bullets,
        sourceDocumentIds,
        layout: slide.layout ?? 'title_bullets',
      } satisfies SlideContent;
    })
    .filter((slide) => {
      if (slide.title.trim().length > 0) return true;
      if ((slide.body ?? '').trim().length > 0) return true;
      if ((slide.bullets ?? []).length > 0) return true;
      return (slide.imageUrl ?? '').trim().length > 0;
    });
