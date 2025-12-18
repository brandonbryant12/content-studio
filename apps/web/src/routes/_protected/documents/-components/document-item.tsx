import { TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { RouterOutput } from '@repo/api/client';
import { DocumentIcon } from './document-icon';
import { formatFileSize } from '@/lib/formatters';

function formatSource(source: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    manual: {
      label: 'Text',
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    upload_txt: {
      label: 'TXT',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    },
    upload_pdf: {
      label: 'PDF',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    },
    upload_docx: {
      label: 'DOCX',
      color:
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    },
    upload_pptx: {
      label: 'PPTX',
      color:
        'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    },
  };
  return (
    map[source] ?? {
      label: source,
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    }
  );
}

export function DocumentItem({
  document,
  onDelete,
  isDeleting,
}: {
  document: RouterOutput['documents']['list'][number];
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const sourceInfo = formatSource(document.source);

  return (
    <div className="group border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 rounded-xl flex items-center gap-4 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all">
      <DocumentIcon source={document.source} />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {document.title}
        </h3>
        <div className="flex items-center gap-3 mt-1.5">
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-medium ${sourceInfo.color}`}
          >
            {sourceInfo.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {document.wordCount.toLocaleString()} words
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(document.originalFileSize)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(document.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          {isDeleting ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
