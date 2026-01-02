// features/documents/components/document-list.tsx
// Presenter: Pure UI component with no data fetching or state management

import {
  MagnifyingGlassIcon,
  PlusIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Link } from '@tanstack/react-router';
import { DocumentItem, type DocumentListItem } from './document-item';
import { UploadDocumentDialog } from './upload-document-dialog';

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="empty-state-lg">
      <div className="empty-state-icon">
        <svg
          className="w-7 h-7 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">
        {hasSearch ? 'No documents found' : 'No documents yet'}
      </h3>
      <p className="empty-state-description">
        {hasSearch
          ? 'Try adjusting your search query.'
          : 'Upload your first document to start creating podcasts and voice overs.'}
      </p>
    </div>
  );
}

export interface DocumentListProps {
  documents: readonly DocumentListItem[];
  searchQuery: string;
  uploadOpen: boolean;
  deletingId: string | null;
  onSearch: (query: string) => void;
  onUploadOpen: (open: boolean) => void;
  onDelete: (id: string) => void;
}

export function DocumentList({
  documents,
  searchQuery,
  uploadOpen,
  deletingId,
  onSearch,
  onUploadOpen,
  onDelete,
}: DocumentListProps) {
  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isEmpty = documents.length === 0;
  const hasNoResults = filteredDocuments.length === 0 && searchQuery.length > 0;

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Source Content</p>
          <h1 className="page-title">Documents</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/podcasts">
            <Button variant="outline">
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Podcast
            </Button>
          </Link>
          <Button onClick={() => onUploadOpen(true)}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Input
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search documents..."
          className="search-input"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Content */}
      {isEmpty ? (
        <EmptyState hasSearch={false} />
      ) : hasNoResults ? (
        <EmptyState hasSearch={true} />
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              onDelete={() => onDelete(doc.id)}
              isDeleting={deletingId === doc.id}
            />
          ))}
        </div>
      )}

      <UploadDocumentDialog open={uploadOpen} onOpenChange={onUploadOpen} />
    </div>
  );
}
