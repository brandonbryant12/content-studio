import { toast } from 'sonner';
import type { SourceInfo } from '@/shared/hooks/use-source-selection';
import { SourceList } from '@/shared/components/source-manager/source-list';
import {
  SOURCE_ASSIGNMENT_HELP,
  SOURCE_MANAGER_HELP,
} from '@/shared/lib/source-guidance';

interface SourceManagerProps {
  sources: SourceInfo[];
  onRemoveSource: (docId: string) => void;
  disabled?: boolean;
}

export function SourceManager({
  sources,
  onRemoveSource,
  disabled,
}: SourceManagerProps) {
  const handleRemove = (docId: string) => {
    if (sources.length <= 1) {
      toast.error('Podcast must have at least one source');
      return;
    }
    onRemoveSource(docId);
  };

  return (
    <>
      <div className="mb-4 rounded-xl border border-success/20 bg-success/5 p-4">
        <p className="text-sm font-semibold text-foreground">
          Sources shape the episode
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {SOURCE_MANAGER_HELP}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {SOURCE_ASSIGNMENT_HELP}
        </p>
      </div>

      <SourceList
        sources={sources}
        disabled={disabled}
        onRemove={handleRemove}
      />
    </>
  );
}
