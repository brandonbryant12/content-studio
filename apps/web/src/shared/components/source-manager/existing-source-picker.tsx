import {
  FileTextIcon,
  MagnifyingGlassIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import {
  useState,
  useCallback,
  useMemo,
  type ChangeEvent,
  type MouseEvent,
} from 'react';
import type { SourceInfo } from '@/shared/hooks/use-source-selection';

interface ExistingSourcePickerProps {
  availableSources: SourceInfo[] | undefined;
  isLoading: boolean;
  selectedIds: string[];
  onToggleSource: (sourceId: string) => void;
  onSwitchToUpload: () => void;
}

export function ExistingSourcePicker({
  availableSources,
  isLoading,
  selectedIds,
  onToggleSource,
  onSwitchToUpload,
}: ExistingSourcePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSources = useMemo(() => {
    if (!availableSources) return [];
    if (!searchQuery.trim()) return availableSources;
    const query = searchQuery.toLowerCase();
    return availableSources.filter((source) =>
      source.title.toLowerCase().includes(query),
    );
  }, [availableSources, searchQuery]);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSourceClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const sourceId = e.currentTarget.dataset.sourceId;
      if (sourceId) {
        onToggleSource(sourceId);
      }
    },
    [onToggleSource],
  );

  if (isLoading) {
    return (
      <div className="loading-center">
        <Spinner className="w-5 h-5" />
      </div>
    );
  }

  return (
    <>
      {availableSources && availableSources.length > 0 && (
        <div className="relative mb-4">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search sources\u2026"
            value={searchQuery}
            onChange={handleSearchChange}
            className="setup-input pl-9"
            aria-label="Search sources"
          />
        </div>
      )}

      {filteredSources.length > 0 ? (
        <div className="space-y-2">
          {filteredSources.map((source) => (
            <button
              key={source.id}
              data-source-id={source.id}
              onClick={handleSourceClick}
              className={`doc-picker-item ${selectedIds.includes(source.id) ? 'selected' : ''}`}
            >
              <div className="doc-picker-item-icon" aria-hidden="true">
                <span>
                  {source.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) ||
                    'DOC'}
                </span>
              </div>
              <div className="doc-picker-item-info">
                <p className="doc-picker-item-title">{source.title}</p>
                <p className="doc-picker-item-meta">
                  {source.wordCount.toLocaleString()} words
                </p>
              </div>
              <div
                aria-hidden="true"
                className={`doc-picker-checkbox ${selectedIds.includes(source.id) ? 'checked' : ''}`}
              >
                {selectedIds.includes(source.id) && (
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : searchQuery ? (
        <div className="empty-state-lg">
          <div className="empty-state-icon">
            <MagnifyingGlassIcon aria-hidden="true" className="w-6 h-6" />
          </div>
          <p className="text-body">No sources match your search.</p>
        </div>
      ) : (
        <div className="empty-state-lg">
          <div className="empty-state-icon">
            <FileTextIcon aria-hidden="true" className="w-6 h-6" />
          </div>
          <p className="text-body">No more sources available to add.</p>
          <Button variant="outline" onClick={onSwitchToUpload} className="mt-4">
            <UploadIcon aria-hidden="true" className="w-4 h-4 mr-2" />
            Upload Source
          </Button>
        </div>
      )}
    </>
  );
}
