import { useState } from 'react';
import { toast } from 'sonner';
import type { SourceInfo } from '@/shared/hooks/use-source-selection';
import { AddSourceDialog } from '@/shared/components/source-manager';
import { SourceList } from '@/shared/components/source-manager';
import {
  SOURCE_ASSIGNMENT_HELP,
  SOURCE_MANAGER_HELP,
} from '@/shared/lib/source-guidance';

interface SourceManagerProps {
  sources: SourceInfo[];
  onAddSources: (docs: SourceInfo[]) => void;
  onRemoveSource: (docId: string) => void;
  disabled?: boolean;
}

export function SourceManager({
  sources,
  onAddSources,
  onRemoveSource,
  disabled,
}: SourceManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleRemove = (docId: string) => {
    if (sources.length <= 1) {
      toast.error('Podcast must have at least one source');
      return;
    }
    onRemoveSource(docId);
  };

  const currentSourceIds = sources.map((d) => d.id);

  return (
    <>
      <div className="mb-4 rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
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
        onAdd={() => setAddDialogOpen(true)}
      />

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        currentSourceIds={currentSourceIds}
        onAddSources={onAddSources}
      />
    </>
  );
}
