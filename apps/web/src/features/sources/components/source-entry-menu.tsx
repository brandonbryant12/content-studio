import {
  GlobeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import type { ComponentProps } from 'react';
import { DEEP_RESEARCH_NAME } from '@/shared/lib/source-guidance';

interface SourceEntryMenuProps {
  label?: string;
  onUpload: () => void;
  onUrl: () => void;
  onResearch: () => void;
  showResearch?: boolean;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
}

export function SourceEntryMenu({
  label = 'Add Source',
  onUpload,
  onUrl,
  onResearch,
  showResearch = true,
  variant,
  size,
  className,
}: SourceEntryMenuProps) {
  const triggerClassName = ['gap-1.5', className].filter(Boolean).join(' ');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={triggerClassName}>
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {showResearch ? (
          <DropdownMenuItem onSelect={onResearch}>
            <MagnifyingGlassIcon aria-hidden="true" />
            {DEEP_RESEARCH_NAME}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onUrl}>
          <GlobeIcon aria-hidden="true" />
          From URL
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onUpload}>
          <UploadIcon aria-hidden="true" />
          Upload
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
