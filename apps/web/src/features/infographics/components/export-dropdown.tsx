import { DownloadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';

interface ExportDropdownProps {
  imageUrl: string | null;
  title: string;
  disabled?: boolean;
}

export function ExportDropdown({
  imageUrl,
  title,
  disabled,
}: ExportDropdownProps) {
  const handleDownloadPng = () => {
    if (!imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
