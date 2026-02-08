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
import type { DocumentInfo } from '@/shared/hooks/use-document-selection';

interface ExistingDocumentPickerProps {
  availableDocuments: DocumentInfo[] | undefined;
  isLoading: boolean;
  selectedIds: string[];
  onToggleDocument: (docId: string) => void;
  onSwitchToUpload: () => void;
}

export function ExistingDocumentPicker({
  availableDocuments,
  isLoading,
  selectedIds,
  onToggleDocument,
  onSwitchToUpload,
}: ExistingDocumentPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = useMemo(() => {
    if (!availableDocuments) return [];
    if (!searchQuery.trim()) return availableDocuments;
    const query = searchQuery.toLowerCase();
    return availableDocuments.filter((doc) =>
      doc.title.toLowerCase().includes(query),
    );
  }, [availableDocuments, searchQuery]);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleDocumentClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const docId = e.currentTarget.dataset.docId;
      if (docId) {
        onToggleDocument(docId);
      }
    },
    [onToggleDocument],
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
      {availableDocuments && availableDocuments.length > 0 && (
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="setup-input pl-9"
            aria-label="Search documents"
          />
        </div>
      )}

      {filteredDocuments.length > 0 ? (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <button
              key={doc.id}
              data-doc-id={doc.id}
              onClick={handleDocumentClick}
              className={`doc-picker-item ${selectedIds.includes(doc.id) ? 'selected' : ''}`}
            >
              <div className="doc-picker-item-icon">
                <span>
                  {doc.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) ||
                    'DOC'}
                </span>
              </div>
              <div className="doc-picker-item-info">
                <p className="doc-picker-item-title">{doc.title}</p>
                <p className="doc-picker-item-meta">
                  {doc.wordCount.toLocaleString()} words
                </p>
              </div>
              <div
                className={`doc-picker-checkbox ${selectedIds.includes(doc.id) ? 'checked' : ''}`}
              >
                {selectedIds.includes(doc.id) && (
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
            <MagnifyingGlassIcon className="w-6 h-6" />
          </div>
          <p className="text-body">No documents match your search.</p>
        </div>
      ) : (
        <div className="empty-state-lg">
          <div className="empty-state-icon">
            <FileTextIcon className="w-6 h-6" />
          </div>
          <p className="text-body">No more documents available to add.</p>
          <Button variant="outline" onClick={onSwitchToUpload} className="mt-4">
            <UploadIcon className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      )}
    </>
  );
}
