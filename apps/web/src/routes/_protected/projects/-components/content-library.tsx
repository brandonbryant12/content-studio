import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpeakerLoudIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Input } from '@repo/ui/components/input';
import { cn } from '@repo/ui/lib/utils';
import { useState, useMemo } from 'react';
import type { RouterOutput } from '@repo/api/client';

type MediaItem = RouterOutput['projects']['getWithMedia']['media'][number];
type MediaType = MediaItem['mediaType'];

interface ContentLibraryProps {
  content: MediaItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onAddExisting: () => void;
  onUploadNew: () => void;
  onRemoveMedia: (mediaId: string) => void;
  isRemoving: boolean;
  removingMediaId?: string;
  /** If set, only show content compatible with this target type */
  filterByCompatibility?: MediaType;
}

function Checkbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange();
      }}
      className={cn(
        'h-4 w-4 shrink-0 rounded-sm border transition-colors',
        checked
          ? 'bg-violet-500 border-violet-500'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
      )}
    >
      {checked && <CheckIcon className="h-3.5 w-3.5 text-white" />}
    </button>
  );
}

const MEDIA_TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <FileTextIcon className="w-4 h-4" />,
  podcast: <SpeakerLoudIcon className="w-4 h-4" />,
};

const MEDIA_TYPE_COLORS: Record<string, string> = {
  document: 'text-blue-500',
  podcast: 'text-violet-500',
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  document: 'Documents',
  podcast: 'Podcasts',
};

interface ContentTypeSectionProps {
  type: string;
  items: MediaItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  searchQuery: string;
}

function ContentTypeSection({
  type,
  items,
  selectedIds,
  onToggle,
  searchQuery,
}: ContentTypeSectionProps) {
  const [expanded, setExpanded] = useState(true);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item.media.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [items, searchQuery]);

  const selectedCount = filteredItems.filter((item) =>
    selectedIds.has(item.mediaId),
  ).length;

  if (filteredItems.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        {expanded ? (
          <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <ChevronRightIcon className="w-4 h-4" />
        )}
        <span className={MEDIA_TYPE_COLORS[type]}>{MEDIA_TYPE_ICONS[type]}</span>
        <span className="flex-1 text-left">
          {MEDIA_TYPE_LABELS[type] ?? type}
        </span>
        <span className="text-xs text-gray-500">
          {selectedCount > 0 && (
            <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full mr-1">
              {selectedCount}
            </span>
          )}
          {filteredItems.length}
        </span>
      </button>

      {expanded && (
        <div className="space-y-0.5 ml-2">
          {filteredItems.map((item) => (
            <label
              key={item.id}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                selectedIds.has(item.mediaId) &&
                  'bg-violet-50 dark:bg-violet-900/20',
              )}
            >
              <Checkbox
                checked={selectedIds.has(item.mediaId)}
                onCheckedChange={() => onToggle(item.mediaId)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.media.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.mediaType === 'document' &&
                    `${(item.media as any).wordCount?.toLocaleString() ?? 0} words`}
                  {item.mediaType === 'podcast' &&
                    ((item.media as any).status ?? 'pending')}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContentLibrary({
  content,
  selectedIds,
  onSelectionChange,
  onAddExisting,
  onUploadNew,
}: ContentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const grouped = useMemo(() => {
    const groups: Record<string, MediaItem[]> = {};
    for (const item of content) {
      if (!groups[item.mediaType]) {
        groups[item.mediaType] = [];
      }
      groups[item.mediaType]!.push(item);
    }
    return groups;
  }, [content]);

  const handleToggle = (mediaId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(mediaId)) {
      newSelection.delete(mediaId);
    } else {
      newSelection.add(mediaId);
    }
    onSelectionChange(newSelection);
  };

  const totalSelected = selectedIds.size;

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Content Library
          </h2>
          {totalSelected > 0 && (
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-full">
              {totalSelected} selected
            </span>
          )}
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-white dark:bg-gray-900"
          />
        </div>
      </div>

      {/* Content sections */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {content.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <FileTextIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              No content yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Add documents to get started
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <ContentTypeSection
              key={type}
              type={type}
              items={items}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-center">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Content
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem onClick={onUploadNew}>
              <UploadIcon className="w-4 h-4 mr-2" />
              Upload Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddExisting}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Existing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
