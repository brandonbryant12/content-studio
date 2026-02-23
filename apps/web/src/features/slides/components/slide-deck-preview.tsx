import type { RouterOutput } from '@repo/api/client';

type SlideDeck = RouterOutput['slideDecks']['get'];
type Slide = SlideDeck['slides'][number];

interface SlideDeckPreviewProps {
  title: string;
  slides: readonly Slide[];
  generatedHtml: string | null;
}

export function SlideDeckPreview({
  title,
  slides,
  generatedHtml,
}: SlideDeckPreviewProps) {
  if (slides.length === 0) {
    return (
      <div className="h-full rounded-xl border border-dashed border-border/60 bg-card/50 p-8 flex items-center justify-center text-sm text-muted-foreground">
        No slides yet. Save settings and click Generate to create a deck.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold truncate">{title}</h2>
        <p className="text-xs text-muted-foreground">
          {slides.length} slide{slides.length === 1 ? '' : 's'}
          {generatedHtml ? ' · HTML export ready' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {slides.map((slide, index) => (
            <article
              key={slide.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Slide {index + 1}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {slide.layout ?? 'title_bullets'}
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-tight">
                {slide.title}
              </h3>
              {slide.body ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-4">
                  {slide.body}
                </p>
              ) : null}
              {slide.bullets && slide.bullets.length > 0 ? (
                <ul className="mt-2 space-y-1 list-disc pl-4">
                  {slide.bullets.slice(0, 4).map((bullet, bulletIndex) => (
                    <li
                      key={`${slide.id}-bullet-${bulletIndex}`}
                      className="text-xs text-muted-foreground leading-relaxed"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
