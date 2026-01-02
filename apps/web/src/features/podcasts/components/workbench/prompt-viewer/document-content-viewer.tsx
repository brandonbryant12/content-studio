import { FileTextIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/clients/apiClient';

interface DocumentContentViewerProps {
  documentId: string;
  documentTitle: string;
}

export function DocumentContentViewer({
  documentId,
  documentTitle,
}: DocumentContentViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isPending, isError } = useQuery({
    ...apiClient.documents.getContent.queryOptions({
      input: { id: documentId },
    }),
    enabled: isExpanded,
  });

  return (
    <div className="doc-content-item">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="doc-content-trigger"
      >
        <div className="doc-content-header">
          <FileTextIcon className="doc-content-icon" />
          <span className="doc-content-title">{documentTitle}</span>
        </div>
        <ChevronDownIcon
          className={`doc-content-chevron ${isExpanded ? 'expanded' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="doc-content-body">
          {isPending && (
            <div className="doc-content-loading">
              <Spinner className="w-4 h-4" />
              <span>Loading content...</span>
            </div>
          )}
          {isError && (
            <div className="doc-content-error">
              Failed to load document content
            </div>
          )}
          {data && <pre className="doc-content-text">{data.content}</pre>}
        </div>
      )}
    </div>
  );
}
