import { FileTextIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';
import {
  type DocumentListItem,
  DocumentEntryMenu,
} from '@/features/documents/components';

export interface RecentSectionProps<T> {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  count: number;
  items: T[];
  isLoading: boolean;
  emptyMessage: string;
  linkTo: string;
  action: ReactNode;
  emptyAction?: ReactNode;
  renderItem: (item: T) => ReactNode;
}

export function RecentSection<T>({
  title,
  icon: Icon,
  iconColor,
  count,
  items,
  isLoading,
  emptyMessage,
  linkTo,
  action,
  emptyAction,
  renderItem,
}: RecentSectionProps<T>) {
  return (
    <div className="recent-section">
      <div className="recent-section-header">
        <div className="recent-section-title">
          <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
          <h3>{title}</h3>
          {count > 0 && <span className="recent-section-count">{count}</span>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Link to={linkTo} className="text-link">
            View all
          </Link>
        </div>
      </div>
      <div className="recent-section-body">
        {isLoading ? (
          <div className="loading-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : items.length === 0 ? (
          <div className="recent-section-empty">
            <p className="text-body">{emptyMessage}</p>
            {emptyAction}
          </div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
}

interface DocumentsRecentSectionProps {
  count: number;
  items: DocumentListItem[];
  isLoading: boolean;
  onUpload: () => void;
  onUrl: () => void;
  onResearch: () => void;
}

export function DocumentsRecentSection({
  count,
  items,
  isLoading,
  onUpload,
  onUrl,
  onResearch,
}: DocumentsRecentSectionProps) {
  return (
    <RecentSection
      title="Documents"
      icon={FileTextIcon}
      iconColor="text-sky-600 dark:text-sky-400"
      count={count}
      items={items}
      isLoading={isLoading}
      emptyMessage="No documents yet"
      linkTo="/documents"
      action={
        <DocumentEntryMenu
          variant="ghost"
          size="sm"
          className="text-xs"
          onResearch={onResearch}
          onUrl={onUrl}
          onUpload={onUpload}
        />
      }
      emptyAction={
        <DocumentEntryMenu
          onResearch={onResearch}
          onUrl={onUrl}
          onUpload={onUpload}
        />
      }
      renderItem={(doc) => (
        <Link
          key={doc.id}
          to="/documents/$documentId"
          params={{ documentId: doc.id }}
          className="recent-item"
        >
          <div className="recent-item-icon bg-sky-500/10">
            <FileTextIcon className="text-sky-600 dark:text-sky-400" />
          </div>
          <div className="recent-item-info">
            <div className="recent-item-title">{doc.title}</div>
            <div className="recent-item-meta">
              {doc.wordCount.toLocaleString()} words
            </div>
          </div>
        </Link>
      )}
    />
  );
}
