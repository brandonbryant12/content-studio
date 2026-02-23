import { DownloadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import { downloadTextFile, toFileSlug } from '@/shared/lib/file-download';

interface SvgToolbarProps {
  svgContent: string | null;
  title: string | null;
}

export function SvgToolbar({ svgContent, title }: SvgToolbarProps) {
  const hasSvg = Boolean(svgContent && svgContent.trim().length > 0);

  const handleDownload = useCallback(() => {
    if (!svgContent) return;

    const fileName = `${toFileSlug(title ?? '', 'untitled-svg')}.svg`;
    downloadTextFile(svgContent, fileName, 'image/svg+xml;charset=utf-8');
  }, [svgContent, title]);

  const handleCopy = useCallback(async () => {
    if (!svgContent) return;

    try {
      const copied = await copyTextToClipboard(svgContent);
      if (copied) {
        toast.success('SVG code copied');
      } else {
        toast.error('Clipboard not available');
      }
    } catch {
      toast.error('Failed to copy SVG code');
    }
  }, [svgContent]);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={!hasSvg}
      >
        <DownloadIcon className="w-4 h-4 mr-1.5" />
        Download SVG
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        disabled={!hasSvg}
      >
        Copy SVG Code
      </Button>
    </div>
  );
}
