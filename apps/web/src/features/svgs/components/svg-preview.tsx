import DOMPurify from 'dompurify';
import { useMemo } from 'react';

interface SvgPreviewProps {
  svgContent: string | null;
}

export function SvgPreview({ svgContent }: SvgPreviewProps) {
  const sanitizedSvg = useMemo(() => {
    if (!svgContent || svgContent.trim().length === 0) return '';

    return DOMPurify.sanitize(svgContent, {
      USE_PROFILES: { svg: true },
    });
  }, [svgContent]);

  if (!sanitizedSvg) {
    return (
      <section className="h-full rounded-xl border border-dashed border-border bg-card/40 flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">No SVG yet</h2>
          <p className="text-sm text-muted-foreground">
            Start a conversation to generate an SVG.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="h-full rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-full overflow-auto">
        <div className="min-h-full p-4 lg:p-6 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(120,120,120,0.08),transparent_50%)]">
          <div
            className="w-full [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto"
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
          />
        </div>
      </div>
    </section>
  );
}
