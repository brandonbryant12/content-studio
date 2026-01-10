// features/infographics/components/workbench/document-content-panel.tsx

import { Cross2Icon, FileTextIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { apiClient } from '@/clients/apiClient';
import { DocumentSelector, type InfographicDocumentInfo } from './document-selector';

export interface DocumentContentPanelProps {
  /** List of documents to display */
  documents: InfographicDocumentInfo[];
  /** Currently active document ID */
  activeDocumentId: string | null;
  /** Callback when active document changes */
  onActiveDocumentChange: (documentId: string) => void;
  /** Callback when a document is added */
  onAddDocument: (docs: InfographicDocumentInfo[]) => void;
  /** Callback when a document is removed */
  onRemoveDocument: (documentId: string) => void;
  /** Whether the panel is disabled (e.g., during generation) */
  disabled?: boolean;
  /** Children to render inside the content area (e.g., text highlighter) */
  children?: ReactNode;
}

/**
 * Panel for displaying and navigating between documents.
 * Shows tabs for each document with content area below.
 */
export function DocumentContentPanel({
  documents,
  activeDocumentId,
  onActiveDocumentChange,
  onAddDocument,
  onRemoveDocument,
  disabled,
  children,
}: DocumentContentPanelProps) {
  const activeDocument = documents.find((d) => d.id === activeDocumentId);

  // If no active document but documents exist, select first one
  if (!activeDocumentId && documents.length > 0 && documents[0]) {
    onActiveDocumentChange(documents[0].id);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs and add button */}
      <div className="doc-panel-header">
        <div className="doc-panel-tabs">
          {documents.map((doc) => (
            <DocumentTab
              key={doc.id}
              document={doc}
              isActive={doc.id === activeDocumentId}
              onClick={() => onActiveDocumentChange(doc.id)}
              onRemove={
                documents.length > 1
                  ? () => onRemoveDocument(doc.id)
                  : undefined
              }
              disabled={disabled}
            />
          ))}
        </div>
        <DocumentSelector
          selectedDocumentIds={documents.map((d) => d.id)}
          onAddDocuments={onAddDocument}
          disabled={disabled}
          triggerVariant="icon"
        />
      </div>

      {/* Content area */}
      <div className="doc-panel-content">
        {activeDocument ? (
          children ?? (
            <DocumentContent documentId={activeDocument.id} />
          )
        ) : (
          <div className="doc-panel-empty">
            <div className="empty-state-icon">
              <FileTextIcon className="w-6 h-6" />
            </div>
            <p className="text-body">No documents selected</p>
            <p className="text-muted-foreground text-sm mt-1">
              Add documents to start building your infographic
            </p>
            <DocumentSelector
              selectedDocumentIds={[]}
              onAddDocuments={onAddDocument}
              disabled={disabled}
              triggerVariant="button"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface DocumentTabProps {
  document: InfographicDocumentInfo;
  isActive: boolean;
  onClick: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}

function DocumentTab({
  document,
  isActive,
  onClick,
  onRemove,
  disabled,
}: DocumentTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`doc-panel-tab group ${isActive ? 'active' : ''}`}
    >
      <FileTextIcon className="w-3.5 h-3.5 shrink-0" />
      <span className="doc-panel-tab-title">{document.title}</span>
      {onRemove && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="doc-panel-tab-remove"
          aria-label={`Remove ${document.title}`}
        >
          <Cross2Icon className="w-3 h-3" />
        </button>
      )}
    </button>
  );
}

interface DocumentContentProps {
  documentId: string;
}

/**
 * Fetches and displays document content.
 * Used as default content when no custom children provided.
 */
function DocumentContent({ documentId }: DocumentContentProps) {
  const { data, isPending, isError } = useQuery({
    ...apiClient.documents.getContent.queryOptions({
      input: { id: documentId },
    }),
  });

  if (isPending) {
    return (
      <div className="doc-panel-loading">
        <Spinner className="w-5 h-5" />
        <span>Loading document...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="doc-panel-error">
        <p>Failed to load document content</p>
      </div>
    );
  }

  return (
    <div className="doc-panel-text-container">
      <pre className="doc-panel-text">{data?.content}</pre>
    </div>
  );
}
