import { DownloadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import {
  buildDownloadFileName,
  downloadFromUrl,
} from '@/shared/lib/file-download';

interface ExportDropdownProps {
  imageUrl: string | null;
  title: string;
  format?: string;
  versionNumber?: number | null;
  updatedAt?: string;
  disabled?: boolean;
}

export function ExportDropdown({
  imageUrl,
  title,
  format,
  versionNumber,
  updatedAt,
  disabled,
}: ExportDropdownProps) {
  const handleDownloadPng = () => {
    if (!imageUrl) return;

    const fileName = buildDownloadFileName({
      title,
      extension: 'png',
      fallbackSlug: 'infographic',
      labels: [format, versionNumber ? `v${versionNumber}` : undefined],
      date: updatedAt,
    });
    downloadFromUrl(imageUrl, fileName);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !imageUrl}
          aria-label="Export options"
        >
          <DownloadIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPng}>
          Download PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
