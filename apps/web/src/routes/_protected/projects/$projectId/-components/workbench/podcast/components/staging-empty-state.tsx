import { SpeakerLoudIcon, FileTextIcon } from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';

interface StagingEmptyStateProps {
  type: 'no-documents' | 'draft' | 'preview';
  isOver?: boolean;
}

export function StagingEmptyState({ type, isOver }: StagingEmptyStateProps) {
  if (type === 'no-documents') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 px-6 rounded-xl border-2 border-dashed transition-colors',
          isOver
            ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
            : 'border-gray-200 dark:border-gray-800',
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <FileTextIcon className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          No documents selected
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
          Select documents from the library on the left, or drag them here to start creating your podcast.
        </p>
      </div>
    );
  }

  if (type === 'draft') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-4">
          <SpeakerLoudIcon className="w-8 h-8 text-violet-500" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          Ready to generate
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
          Click &ldquo;Generate&rdquo; in the panel on the right to create the podcast.
        </p>
      </div>
    );
  }

  // type === 'preview'
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-4">
        <SpeakerLoudIcon className="w-8 h-8 text-violet-500" />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        Ready to generate
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
        Configure your podcast settings and click &ldquo;Generate&rdquo; to create a script from your documents.
      </p>
    </div>
  );
}
