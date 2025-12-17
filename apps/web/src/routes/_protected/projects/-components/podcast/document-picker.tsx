import type { RouterOutput } from '@repo/api/client';

type Document = RouterOutput['projects']['get']['documents'][number];

export function DocumentPicker({
  documents,
  selectedIds,
  onSelect,
}: {
  documents: Document[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No documents in this project. Add documents first.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 dark:border-gray-700">
      {documents.map((doc) => (
        <label
          key={doc.id}
          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
            selectedIds.has(doc.id)
              ? 'bg-violet-50 dark:bg-violet-900/20'
              : ''
          }`}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(doc.id)}
            onChange={() => onSelect(doc.id)}
            className="rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {doc.wordCount.toLocaleString()} words
            </p>
          </div>
        </label>
      ))}
    </div>
  );
}
